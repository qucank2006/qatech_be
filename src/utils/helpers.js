const fs = require('fs');
const path = require('path');

/**
 * Xóa file vật lý một cách an toàn
 * @param {string} filePath - Đường dẫn file cần xóa
 * @returns {boolean} - True nếu xóa thành công
 */
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    // Silent fail - file có thể đã bị xóa
    return false;
  }
  return false;
};

/**
 * Tạo slug từ tiếng Việt
 * @param {string} text - Text cần chuyển thành slug
 * @returns {string} - Slug
 */
const createSlug = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

/**
 * Parse JSON an toàn
 * @param {string} jsonString - JSON string cần parse
 * @param {*} defaultValue - Giá trị mặc định nếu parse thất bại
 * @returns {*} - Parsed value hoặc default value
 */
const safeJSONParse = (jsonString, defaultValue = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return defaultValue;
  }
};

/**
 * Xóa các key có giá trị undefined khỏi object
 * @param {object} obj - Object cần clean
 * @returns {object} - Object đã clean
 */
const removeUndefined = (obj) => {
  Object.keys(obj).forEach(key => 
    obj[key] === undefined && delete obj[key]
  );
  return obj;
};

/**
 * Validate và format specs cho màn hình
 * @param {object} data - Request body data
 * @returns {object} - Formatted monitor specs
 */
const formatMonitorSpecs = (data) => {
  const {
    monitorSize,           // Kích thước
    panelType,             // Tấm nền (IPS, VA, TN, OLED...)
    aspectRatio,           // Tỉ lệ màn hình (16:9, 21:9, 16:10...)
    refreshRate,           // Tần số quét (60Hz, 144Hz, 240Hz...)
    responseTime,          // Thời gian phản hồi (1ms, 4ms...)
    vesa,                  // Treo tường VESA (100x100, 75x75...)
    ports,                 // Cổng kết nối (array hoặc string)
    resolution             // Độ phân giải (1920x1080, 2560x1440...)
  } = data;

  return {
    size: monitorSize,
    panel: panelType,
    aspectRatio: aspectRatio,
    refreshRate: refreshRate,
    responseTime: responseTime,
    vesa: vesa,
    ports: Array.isArray(ports) ? ports : (ports ? [ports] : []),
    resolution: resolution
  };
};

/**
 * Validate monitor specs
 * @param {object} specs - Monitor specs object
 * @returns {boolean} - Valid or not
 */
const validateMonitorSpecs = (specs) => {
  const required = ['size', 'resolution'];
  return required.every(field => specs && specs[field]);
};

module.exports = {
  deleteFile,
  createSlug,
  safeJSONParse,
  removeUndefined,
  formatMonitorSpecs,
  validateMonitorSpecs
};
