const fs = require('fs');
const path = require('path');


// Xóa file vật lý
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {

    return false;
  }
  return false;
};


// Tạo slug từ tiếng Việt
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


// Parse JSON an toàn
const safeJSONParse = (jsonString, defaultValue = {}) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return defaultValue;
  }
};


// Xóa các key có giá trị undefined
const removeUndefined = (obj) => {
  Object.keys(obj).forEach(key => 
    obj[key] === undefined && delete obj[key]
  );
  return obj;
};


// Định dạng thông số màn hình
const formatMonitorSpecs = (data) => {
  const {
    monitorSize,
    panelType,
    aspectRatio,
    refreshRate,
    responseTime,
    vesa,
    ports,
    resolution
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


// Kiểm tra tính hợp lệ của thông số màn hình
const validateMonitorSpecs = (specs) => {
  const required = ['size', 'resolution'];
  return required.every(field => specs && specs[field]);
};


// Chuẩn hóa đường dẫn ảnh
const normalizeImagePath = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return '';
  

  let normalized = imagePath.replace(/\\/g, '/');
  

  normalized = normalized.replace(/^uploads\
  

  normalized = normalized.replace(/^\/+|\/+$/g, '');
  

  normalized = path.basename(normalized);
  

  return normalized.toLowerCase();
};

module.exports = {
  deleteFile,
  createSlug,
  safeJSONParse,
  removeUndefined,
  formatMonitorSpecs,
  validateMonitorSpecs,
  normalizeImagePath
};
