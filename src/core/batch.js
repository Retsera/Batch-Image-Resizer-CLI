/**
 * Core Business Logic - Batch Processing Orchestration and Metrics
 */

const fs = require('fs').promises;
const { calcReduction } = require('../cli/ui');

/**
 * Run a single task with metrics (timing and file size calculations).
 * @param {WorkerPool} pool - Worker pool instance.
 * @param {object} task - Task object.
 * @returns {Promise<object>} Result with metrics.
 */
async function runTaskWithMetrics(pool, task) {
  const beforeStat = await fs.stat(task.inputPath);
  const start = Date.now();
  const workerResult = await pool.addTask(task);
  const durationMs = Date.now() - start;

  if (!workerResult || workerResult.status === 'error') {
    return {
      ...workerResult,
      inputPath: task.inputPath,
      outputPath: task.outputPath,
      size: task.size,
      beforeBytes: beforeStat.size,
      afterBytes: 0,
      reduction: '0.00%',
      durationMs,
    };
  }

  const afterStat = await fs.stat(task.outputPath);
  return {
    ...workerResult,
    inputPath: task.inputPath,
    outputPath: task.outputPath,
    size: task.size,
    beforeBytes: beforeStat.size,
    afterBytes: afterStat.size,
    reduction: calcReduction(beforeStat.size, afterStat.size),
    durationMs,
  };
}

/**
 * Process batch of tasks with concurrency limit.
 * @param {WorkerPool} pool - Worker pool instance.
 * @param {object[]} tasks - Array of task objects.
 * @param {number} concurrency - Number of concurrent workers.
 * @param {object} hooks - Callback hooks.
 * @param {function} hooks.onTaskStart - Called when task starts.
 * @param {function} hooks.onProgress - Called on each task completion.
 * @returns {Promise<object[]>} Array of results.
 */
async function processBatchConcurrent(pool, tasks, concurrency, hooks = {}) {
  const { onTaskStart, onProgress } = hooks;
  const total = tasks.length;
  if (total === 0) return [];
  const limit = Math.max(1, concurrency);
  const results = new Array(total);
  let nextTask = 0;
  let completed = 0;

  async function workerFn() {
    while (true) {
      const i = nextTask++;
      if (i >= total) break;
      const task = tasks[i];
      if (onTaskStart) {
        try {
          const st = await fs.stat(task.inputPath);
          onTaskStart(task, require('../cli/ui').formatBytesHuman(st.size));
        } catch {
          onTaskStart(task, '?');
        }
      }
      const r = await runTaskWithMetrics(pool, task);
      results[i] = r;
      completed += 1;
      if (onProgress) onProgress(completed, total, r, task);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, total) }, () => workerFn())
  );
  return results;
}

module.exports = {
  runTaskWithMetrics,
  processBatchConcurrent,
};
