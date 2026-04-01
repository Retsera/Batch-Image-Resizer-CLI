const { Worker } = require('worker_threads');
const os = require('os');
const path = require('path');

function clampPositiveInt(n, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v) || v < 1) return fallback;
  return Math.floor(v);
}

/**
 * WorkerPool (no external libs):
 * - Reuse workers (không tạo Worker mới cho mỗi task)
 * - Giới hạn số task chạy song song bằng số worker
 * - Có queue để chờ khi worker đang bận
 */
class WorkerPool {
  /**
   * @param {object} options
   * @param {number} [options.workers] số worker. Nếu không truyền: os.cpus().length - 1 (tối thiểu 1)
   * @param {(msg: string) => void} [options.logger] hàm log (mặc định: console.log)
   */
  constructor(options = {}) {
    const defaultWorkers = Math.max(1, os.cpus().length - 1);
    this.size = clampPositiveInt(options.workers, defaultWorkers);
    this.logger = typeof options.logger === 'function' ? options.logger : console.log;

    this._workerPath = path.join(__dirname, 'worker.js');
    this._workers = [];
    this._idle = [];
    this._busyCount = 0;
    this._queue = [];
    this._closing = false;

    for (let i = 0; i < this.size; i += 1) {
      this._spawnWorker();
    }
  }

  get busyCount() {
    return this._busyCount;
  }

  /**
   * Add a task to the pool.
   * @param {object} task payload được gửi nguyên vẹn sang worker.js
   * @returns {Promise<any>} message từ worker
   */
  addTask(task) {
    if (this._closing) {
      return Promise.reject(new Error('WorkerPool is closing; cannot accept new tasks.'));
    }

    return new Promise((resolve, reject) => {
      this._queue.push({ task, resolve, reject });
      this._drain();
    });
  }

  /**
   * Terminate all workers and reject queued tasks.
   */
  async closeAll() {
    if (this._closing) return;
    this._closing = true;

    // reject remaining queued tasks
    while (this._queue.length > 0) {
      const job = this._queue.shift();
      job.reject(new Error('WorkerPool closed before task could start.'));
    }

    const terminations = this._workers.map(async (w) => {
      try {
        await w.terminate();
      } catch {
        // ignore terminate errors
      }
    });

    await Promise.allSettled(terminations);
    this._workers = [];
    this._idle = [];
    this._busyCount = 0;
  }

  _spawnWorker() {
    const worker = new Worker(this._workerPath);
    worker.__currentJob = null;

    worker.on('message', (msg) => {
      const job = worker.__currentJob;
      worker.__currentJob = null;

      if (job) {
        job.resolve(msg);
      }

      this._markIdle(worker);
      this._drain();
    });

    worker.on('error', (err) => {
      const job = worker.__currentJob;
      worker.__currentJob = null;

      if (job) {
        job.reject(err);
      }

      // remove failed worker, then replace (if not closing)
      this._removeWorker(worker);
      if (!this._closing) {
        this._spawnWorker();
        this._drain();
      }
    });

    this._workers.push(worker);
    this._idle.push(worker);
  }

  _removeWorker(worker) {
    this._idle = this._idle.filter((w) => w !== worker);
    this._workers = this._workers.filter((w) => w !== worker);

    try {
      worker.terminate();
    } catch {
      // ignore
    }
  }

  _markBusy() {
    this._busyCount += 1;
    this.logger(`Worker đang bận: ${this._busyCount}/${this.size}`);
  }

  _markIdle(worker) {
    if (this._busyCount > 0) this._busyCount -= 1;
    this._idle.push(worker);
    this.logger(`Worker đang bận: ${this._busyCount}/${this.size}`);
  }

  _drain() {
    if (this._closing) return;

    while (this._idle.length > 0 && this._queue.length > 0) {
      const worker = this._idle.shift();
      const job = this._queue.shift();
      worker.__currentJob = job;

      this._markBusy();
      worker.postMessage(job.task);
    }
  }
}

module.exports = { WorkerPool };

