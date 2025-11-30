const { spawn } = require('child_process');
const path = require('path');

class PythonTilerWorker {
  constructor(options = {}) {
    this.pythonBinary = options.pythonBinary || process.env.POSTERMAKER_PYTHON || 'python';
    this.jobs = new Map();
    this.scriptPath = path.join(__dirname, '..', '..', '..', 'image_to_a4_tiles.py');
  }

  run(request, onMessage) {
    return new Promise((resolve, reject) => {
      const args = this.buildArgs(request);
      const env = { ...process.env, PYTHONUNBUFFERED: '1' };
      const child = spawn(this.pythonBinary, args, { env });
      const jobId = request.jobId;
      this.jobs.set(jobId, child);
      const generated = [];

      const emitProgress = (step, progress, message) => {
        onMessage?.({ type: 'progress', jobId, step, progress, message });
      };

      const emitLog = (message) => {
        onMessage?.({ type: 'log', jobId, message });
      };

      emitProgress('queued', 0, 'Python tiler queued');

      child.stdout.on('data', (chunk) => {
        const lines = chunk.toString().split(/\r?\n/);
        lines.forEach((line) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          if (trimmed.startsWith('PROGRESS')) {
            const [, stepPart, pctPart] = trimmed.match(/step=([^\s]+) pct=([^\s]+)/) || [];
            if (stepPart && pctPart) {
              emitProgress(stepPart, Number(pctPart), `Python ${stepPart}`);
            }
            return;
          }
          if (trimmed.startsWith('-')) {
            const resolved = path.resolve(trimmed.replace(/^-\s*/, ''));
            generated.push(resolved);
            emitProgress('packaging', 0.9, 'Python tiler writing output');
            return;
          }
          emitLog(trimmed);
        });
      });

      child.stderr.on('data', (chunk) => {
        emitLog(chunk.toString());
      });

      child.on('error', (error) => {
        this.jobs.delete(jobId);
        reject(error);
      });

      child.on('close', (code) => {
        this.jobs.delete(jobId);
        if (code === 0) {
          emitProgress('packaging', 1, 'Python tiler finished');
          resolve({ files: generated.length ? generated : [] });
        } else {
          reject(new Error(`Python tiler exited with code ${code}`));
        }
      });
    });
  }

  async cancel(jobId) {
    const child = this.jobs.get(jobId);
    if (!child) return;
    child.kill('SIGTERM');
    this.jobs.delete(jobId);
  }

  async dispose() {
    if (this.jobs.size === 0) {
      return;
    }
    for (const child of this.jobs.values()) {
      try {
        child.kill('SIGTERM');
      } catch (_error) {
        // ignore during shutdown
      }
    }
    this.jobs.clear();
  }

  buildArgs(request) {
    const { imagePath, document, guides, export: exportSettings, tempDir } = request;
    const format = exportSettings?.format || 'pdf';
    const args = [
      this.scriptPath,
      '--input',
      imagePath,
      '--output-dir',
      path.join(tempDir, 'python-output'),
      '--dpi',
      String(document.dpi),
      '--orientation',
      document.orientation,
      '--margin-mm',
      String(document.marginMm),
      '--overlap-mm',
      String(document.overlapMm),
      '--format',
      format
    ];
    if (guides?.cropMarks || guides?.tileLabels) {
      args.push('--add-guides');
    }
    return args;
  }
}

module.exports = PythonTilerWorker;
