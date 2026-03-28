const fs = require('fs').promises;
const path = require('path');

/**
 * Quét đệ quy thư mục để lấy danh sách tất cả file ảnh.
 * 
 * @param {string} dir Thư mục cần quét.
 * @param {boolean} recursive Có quét đệ quy hay không (mặc định là true).
 * @returns {Promise<string[]>} Mảng chứa đường dẫn đầy đủ của các file ảnh.
 */
async function getAllImages(dir, recursive = true) {
    let images = [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory() && recursive) {
                // Nếu là thư mục và được phép đệ quy, tiếp tục quét bên trong
                const subDirImages = await getAllImages(fullPath, recursive);
                images = images.concat(subDirImages);
            } else if (entry.isFile()) {
                // Kiểm tra phần mở rộng của file
                const ext = path.extname(entry.name).toLowerCase();
                if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
                    images.push(fullPath);
                }
            }
        }
    } catch (error) {
        console.error(`Lỗi khi quét thư mục ${dir}:`, error.message);
    }
    return images;
}

module.exports = {
    getAllImages
};
