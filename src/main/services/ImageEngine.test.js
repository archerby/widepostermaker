const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const ImageEngine = require('./ImageEngine');

const baseRequest = {
  imagePath: 'fixture.jpg',
  document: { paperSize: 'A4', orientation: 'portrait', dpi: 300, marginMm: 5, overlapMm: 3 },
  grid: { rows: 1, cols: 1 },
  guides: { cropMarks: true, tileLabels: true },
  export: { format: 'pdf' }
};

const tempDirs = [];
const createTempRequest = async (jobId) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'poster-engine-test-'));
  tempDirs.push(tempDir);
  return { ...baseRequest, jobId, tempDir };
};

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const createWorkerStub = (overrides = {}) => {
  const worker = {
    run: vi.fn(),
    cancel: vi.fn().mockResolvedValue(),
    dispose: vi.fn().mockResolvedValue()
  };
  return Object.assign(worker, overrides);
};

const createDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('ImageEngine slice workflow', () => {
  it('resolves when node worker succeeds', async () => {
    const nodeWorker = createWorkerStub({ run: vi.fn().mockResolvedValue({ files: ['node.pdf'] }) });
    const pythonWorker = createWorkerStub();
    const engine = new ImageEngine({
      createNodeWorker: () => nodeWorker,
      createPythonWorker: () => pythonWorker
    });
    const request = await createTempRequest('job-node-success');
    const result = await engine.slice(request);
    expect(result.files).toEqual(['node.pdf']);
    expect(nodeWorker.run).toHaveBeenCalledTimes(1);
    expect(pythonWorker.run).not.toHaveBeenCalled();
  });

  it('propagates node failures when fallback disabled', async () => {
    const nodeWorker = createWorkerStub({ run: vi.fn().mockRejectedValue(new Error('node boom')) });
    const pythonWorker = createWorkerStub();
    const engine = new ImageEngine({
      enablePythonFallback: false,
      createNodeWorker: () => nodeWorker,
      createPythonWorker: () => pythonWorker
    });
    const request = await createTempRequest('job-node-error');
    await expect(engine.slice(request)).rejects.toThrow('node boom');
    expect(pythonWorker.run).not.toHaveBeenCalled();
  });

  it('falls back to python worker when enabled', async () => {
    const nodeWorker = createWorkerStub({ run: vi.fn().mockRejectedValue(new Error('node fail')) });
    const pythonWorker = createWorkerStub({ run: vi.fn().mockResolvedValue({ files: ['python.pdf'] }) });
    const engine = new ImageEngine({
      enablePythonFallback: true,
      createNodeWorker: () => nodeWorker,
      createPythonWorker: () => pythonWorker
    });
    const logs = [];
    engine.on('log', (entry) => logs.push(entry.message));
    const request = await createTempRequest('job-fallback');
    const result = await engine.slice(request);
    expect(result.files).toEqual(['python.pdf']);
    expect(nodeWorker.run).toHaveBeenCalled();
    expect(pythonWorker.run).toHaveBeenCalled();
    expect(logs.some((msg) => msg.includes('Node tiler failed'))).toBe(true);
  });
});

describe('ImageEngine cancellation', () => {
  it('cancels active node job', async () => {
    const deferred = createDeferred();
    const nodeWorker = createWorkerStub({
      run: vi.fn().mockImplementation(() => deferred.promise),
      cancel: vi.fn().mockImplementation(async () => {
        deferred.reject(new Error('Job canceled'));
      })
    });
    const pythonWorker = createWorkerStub();
    const engine = new ImageEngine({
      createNodeWorker: () => nodeWorker,
      createPythonWorker: () => pythonWorker
    });
    const request = await createTempRequest('job-cancel-node');
    const slicePromise = engine.slice(request);
    await vi.waitFor(() => expect(nodeWorker.run).toHaveBeenCalled());
    await engine.cancel(request.jobId);
    await expect(slicePromise).rejects.toThrow('Job canceled');
    expect(nodeWorker.cancel).toHaveBeenCalledWith(request.jobId);
    expect(engine.activeJobs.size).toBe(0);
  });

  it('cancels active python job after fallback', async () => {
    const nodeWorker = createWorkerStub({ run: vi.fn().mockRejectedValue(new Error('node fail')) });
    const deferred = createDeferred();
    const pythonWorker = createWorkerStub({
      run: vi.fn().mockImplementation(() => deferred.promise),
      cancel: vi.fn().mockImplementation(async () => {
        deferred.reject(new Error('Job canceled'));
      })
    });
    const engine = new ImageEngine({
      enablePythonFallback: true,
      createNodeWorker: () => nodeWorker,
      createPythonWorker: () => pythonWorker
    });
    const request = await createTempRequest('job-cancel-python');
    const slicePromise = engine.slice(request);
    await vi.waitFor(() => expect(pythonWorker.run).toHaveBeenCalled());
    await engine.cancel(request.jobId);
    await expect(slicePromise).rejects.toThrow('Job canceled');
    expect(pythonWorker.cancel).toHaveBeenCalledWith(request.jobId);
    expect(engine.activeJobs.size).toBe(0);
  });
});
