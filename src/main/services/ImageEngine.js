const { EventEmitter } = require('events');
const fs = require('fs/promises');
const NodeTilerWorker = require('./NodeTilerWorker');
const PythonTilerWorker = require('./PythonTilerWorker');

const DEFAULT_OPTIONS = {
  enablePythonFallback: process.env.POSTERMAKER_ENABLE_PYTHON === '1'
};

const DEFAULT_FACTORIES = {
  createNodeWorker: () => new NodeTilerWorker(),
  createPythonWorker: () => new PythonTilerWorker()
};

class ImageEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    const { createNodeWorker, createPythonWorker, ...engineOptions } = options;
    this.options = { ...DEFAULT_OPTIONS, ...engineOptions };
    this.factories = {
      createNodeWorker: createNodeWorker || DEFAULT_FACTORIES.createNodeWorker,
      createPythonWorker: createPythonWorker || DEFAULT_FACTORIES.createPythonWorker
    };
    this.nodeWorker = this.factories.createNodeWorker();
    this.pythonWorker = this.factories.createPythonWorker();
    this.activeJobs = new Map();
  }

  async slice(request) {
    const jobRecord = {
      jobId: request.jobId,
      tempDir: request.tempDir,
      strategy: 'node'
    };
    this.activeJobs.set(request.jobId, jobRecord);
    await fs.mkdir(request.tempDir, { recursive: true });
    this.emit('log', { jobId: request.jobId, message: `Slice start · strategy=node · grid=${request.grid?.rows || '?'}x${request.grid?.cols || '?'}` });

    const handleMessage = (message) => {
      if (!message) return;
      const jobId = message.jobId || request.jobId;
      if (message.type === 'progress') {
        this.emit('progress', {
          jobId,
          step: message.step,
          progress: typeof message.progress === 'number' ? message.progress : 0,
          message: message.message
        });
        return;
      }
      if (message.type === 'log') {
        this.emit('log', { jobId, message: message.message });
      }
    };

    try {
      const output = await this.nodeWorker.run(request, handleMessage);
      this.emit('log', { jobId: request.jobId, message: 'Node tiler finished successfully' });
      this.activeJobs.delete(request.jobId);
      return output;
    } catch (nodeError) {
      this.emit('log', {
        jobId: request.jobId,
        message: `Node tiler failed: ${nodeError.message || nodeError}`
      });
      if (!this.options.enablePythonFallback) {
        this.activeJobs.delete(request.jobId);
        throw nodeError;
      }
      try {
        jobRecord.strategy = 'python';
        this.emit('log', { jobId: request.jobId, message: 'Switching to python tiler fallback' });
        const output = await this.pythonWorker.run(request, handleMessage);
        this.emit('log', { jobId: request.jobId, message: 'Python tiler finished successfully' });
        this.activeJobs.delete(request.jobId);
        return output;
      } catch (pythonError) {
        this.activeJobs.delete(request.jobId);
        const aggregate = new Error(`Both tiling strategies failed: ${pythonError.message}`);
        aggregate.stack = pythonError.stack;
        aggregate.cause = nodeError;
        throw aggregate;
      }
    }
  }

  async cancel(jobId) {
    const record = this.activeJobs.get(jobId);
    if (!record) return;
    this.emit('log', { jobId, message: `Cancelling job via ${record.strategy} worker` });
    if (record.strategy === 'python') {
      await this.pythonWorker.cancel(jobId);
    } else {
      await this.nodeWorker.cancel(jobId);
    }
    this.activeJobs.delete(jobId);
    this.emit('progress', { jobId, step: 'error', progress: 0, message: 'Job canceled' });
  }

  async shutdown() {
    const activeJobIds = Array.from(this.activeJobs.keys());
    await Promise.all(
      activeJobIds.map((jobId) =>
        this.cancel(jobId).catch(() => {
          // Ignore errors while shutting down.
        })
      )
    );
    if (typeof this.nodeWorker.dispose === 'function') {
      await this.nodeWorker.dispose().catch(() => undefined);
    }
    if (typeof this.pythonWorker.dispose === 'function') {
      await this.pythonWorker.dispose().catch(() => undefined);
    }
  }
}

module.exports = ImageEngine;
