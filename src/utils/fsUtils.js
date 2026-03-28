const path = require('path');

/**
 * Tạo đường dẫn output theo kích thước và giữ nguyên cấu trúc thư mục từ ảnh gốc.
 * (preserve folder structure)
 * 
 * @param {string} inputPath - Đường dẫn đến file ảnh (vd: 'images/vacation/sea.jpg')
 * @param {string} outputDir - Thư mục đích nhận ảnh output (vd: 'resized')
 * @param {string|number} [size=''] - Phân loại folder khi resize theo các chuẩn (vd: 1024, 720). Nếu có sẽ thêm subfolder này.
 * @returns {string} Trả về đường dẫn hợp lệ cho output. VD: 'resized/1024/vacation/sea.jpg'
 */
function buildOutputPath(inputPath, outputDir, size) {
    // Mặc định gốc input là thư mục 'images'
    const baseInputDir = 'images';
    
    // Tách lấy đường dẫn tương đối tính từ baseInputDir
    // Ví dụ: path.relative('images', 'images/vacation/sea.jpg') -> 'vacation/sea.jpg'
    let relativeStructure = path.relative(baseInputDir, inputPath);

    // Đề phòng trường hợp inputPath không nằm trong thư mục 'images' 
    // thì biến relativeStructure sẽ trả về dạng '../' hoặc bị tuyệt đối
    if (relativeStructure.startsWith('..') || path.isAbsolute(relativeStructure)) {
        relativeStructure = path.basename(inputPath); // fallback lấy file name không có folder con
    }

    // Nếu có biến size thì thêm subdirectory cho kích thước
    if (size) {
        return path.join(outputDir, String(size), relativeStructure);
    }
    
    return path.join(outputDir, relativeStructure);
}

module.exports = {
   buildOutputPath
};
