const path = require('path');
const { Worker } = require('worker_threads');

class NodeTilerWorker {
  constructor() {
    this.jobs = new Map();
    this.workerPath = path.join(__dirname, '..', '..', 'workers', 'nodeTilerWorker.js');
  }

  run(request, onMessage) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(this.workerPath, { workerData: null });
      const jobId = request.jobId;
      this.jobs.set(jobId, worker);

      const finalize = (err) => {
        this.jobs.delete(jobId);
        worker.terminate().catch(() => undefined);
        if (err) {
          reject(err);
        }
      };

      worker.on('message', (message) => {
        if (!message) return;
        if (message.type === 'progress' || message.type === 'log') {
          onMessage?.(message);
        }
        if (message.type === 'complete') {
          finalize();
          resolve(message.output);
        }
        if (message.type === 'error') {
          finalize(new Error(message.error));
        }
      });

      worker.on('error', (error) => finalize(error));
      worker.on('exit', (code) => {
        if (code !== 0) {
          finalize(new Error(`Node tiler worker exited with code ${code}`));
        }
      });

      worker.postMessage({ type: 'start', request });
    });
  }

  async cancel(jobId) {
    const worker = this.jobs.get(jobId);
    if (!worker) return;
    try {
      worker.postMessage({ type: 'cancel', jobId });
    } catch (_error) {
      // ignore
    }
    this.jobs.delete(jobId);
    await worker.terminate().catch(() => undefined);
  }

  async dispose() {
    if (this.jobs.size === 0) {
      return;
    }
    const workers = Array.from(this.jobs.values());
    this.jobs.clear();
    await Promise.all(workers.map((worker) => worker.terminate().catch(() => undefined)));
  }
}

module.exports = NodeTilerWorker;
