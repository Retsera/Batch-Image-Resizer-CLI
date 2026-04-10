/**
 * Core Business Logic - Task Generation and Validation
 */

const path = require('path');
const { buildOutputPath } = require('../utils/fs');

/**
 * Generate resize tasks from a list of images.
 * @param {string[]} images - Array of image file paths.
 * @param {object} options - Configuration options.
 * @param {string} options.input - Input directory.
 * @param {string} options.output - Output directory.
 * @param {number} options.width - Single resize width.
 * @param {number[]} options.sizes - Array of resize widths.
 * @param {number} options.quality - JPEG/WebP quality (1-100).
 * @param {string} options.format - Output format (jpeg, webp, avif).
 * @returns {object[]} Array of task objects.
 */
function generateTasks(images, options) {
  const useSizes = Array.isArray(options.sizes) && options.sizes.length > 0;
  const sizeList = useSizes ? options.sizes : [options.width];
  const tasks = [];

  for (const inputPath of images) {
    for (const size of sizeList) {
      const sizeOutputRoot = path.join(options.output, String(size));
      tasks.push({
        inputPath,
        outputPath: buildOutputPath(inputPath, options.input, sizeOutputRoot),
        width: size,
        quality: options.quality,
        format: options.format,
        size,
      });
    }
  }

  return tasks;
}

module.exports = {
  generateTasks,
};
