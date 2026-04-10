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
    this.taskTimeoutMs = clampPositiveInt(options.taskTimeoutMs, 60_000);
    this.maxRetries = clampPositiveInt(options.maxRetries, 2);

    this._workerPath = path.join(__dirname, 'worker.js');
    this._workers = [];
    this._idle = [];
    this._busyCount = 0;
    this._queue = [];
    this._closing = false;
    this._boundSignalHandler = this._handleProcessSignal.bind(this);
    this._processHandlersAttached = false;

    for (let i = 0; i < this.size; i += 1) {
      this._spawnWorker();
    }
    this._attachProcessHandlers();
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
      this._queue.push({ task, resolve, reject, retries: 0 });
      this._drain();
    });
  }

  /**
   * Terminate all workers and reject queued tasks.
   */
  async closeAll() {
    if (this._closing) return;
    this._closing = true;
    this._detachProcessHandlers();

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

  async _handleProcessSignal() {
    this.logger('WorkerPool received shutdown signal. Terminating workers...');
    await this.closeAll();
  }

  _attachProcessHandlers() {
    if (this._processHandlersAttached) return;
    process.once('SIGINT', this._boundSignalHandler);
    process.once('SIGTERM', this._boundSignalHandler);
    this._processHandlersAttached = true;
  }

  _detachProcessHandlers() {
    if (!this._processHandlersAttached) return;
    process.removeListener('SIGINT', this._boundSignalHandler);
    process.removeListener('SIGTERM', this._boundSignalHandler);
    this._processHandlersAttached = false;
  }

  _spawnWorker() {
    const worker = new Worker(this._workerPath);
    worker.__currentJob = null;
    worker.__taskTimer = null;

    worker.on('message', (msg) => {
      const job = worker.__currentJob;
      worker.__currentJob = null;
      this._clearWorkerTimer(worker);

      if (job) {
        job.resolve(msg);
      }

      this._markIdle(worker);
      this._drain();
    });

    worker.on('error', (err) => {
      const job = worker.__currentJob;
      worker.__currentJob = null;
      this._clearWorkerTimer(worker);

      if (job) {
        this._retryOrReject(job, err);
      }

      // remove failed worker, then replace (if not closing)
      this._removeWorker(worker, Boolean(job));
      if (!this._closing) {
        this._spawnWorker();
        this._drain();
      }
    });

    worker.on('exit', (code) => {
      const job = worker.__currentJob;
      worker.__currentJob = null;
      this._clearWorkerTimer(worker);

      const crashed = code !== 0;
      if (crashed && job) {
        this._retryOrReject(job, new Error(`Worker exited unexpectedly with code ${code}`));
      }

      if (!this._workers.includes(worker)) {
        return;
      }

      this._removeWorker(worker, Boolean(job));
      if (!this._closing && crashed) {
        this._spawnWorker();
        this._drain();
      }
    });

    this._workers.push(worker);
    this._idle.push(worker);
  }

  _clearWorkerTimer(worker) {
    if (worker.__taskTimer) {
      clearTimeout(worker.__taskTimer);
      worker.__taskTimer = null;
    }
  }

  _removeWorker(worker, wasBusy = false) {
    if ((wasBusy || worker.__currentJob) && this._busyCount > 0) {
      this._busyCount -= 1;
      this.logger(`Worker đang bận: ${this._busyCount}/${this.size}`);
    }
    this._idle = this._idle.filter((w) => w !== worker);
    this._workers = this._workers.filter((w) => w !== worker);
    this._clearWorkerTimer(worker);

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

  _retryOrReject(job, err) {
    if (job.retries < this.maxRetries && !this._closing) {
      const nextRetries = job.retries + 1;
      this.logger(
        `Worker task failed, retrying (${nextRetries}/${this.maxRetries})...`
      );
      this._queue.unshift({
        ...job,
        retries: nextRetries,
      });
      return;
    }
    job.reject(err);
  }

  _drain() {
    if (this._closing) return;

    while (this._idle.length > 0 && this._queue.length > 0) {
      const worker = this._idle.shift();
      const job = this._queue.shift();
      worker.__currentJob = job;

      this._markBusy();
      worker.__taskTimer = setTimeout(() => {
        const timeoutJob = worker.__currentJob;
        worker.__currentJob = null;
        if (!timeoutJob) return;

        this.logger(`Worker task timed out after ${this.taskTimeoutMs}ms. Restarting worker...`);
        const timeoutErr = new Error(
          `Worker task timeout after ${this.taskTimeoutMs}ms`
        );
        this._retryOrReject(timeoutJob, timeoutErr);
        this._removeWorker(worker, true);
        if (!this._closing) {
          this._spawnWorker();
          this._drain();
        }
      }, this.taskTimeoutMs);

      worker.postMessage(job.task);
    }
  }
}

module.exports = { WorkerPool };

