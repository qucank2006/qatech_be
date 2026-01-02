const Product = require("../models/Product");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");

// Tạo slug từ tiên Việt
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

// Tìm sản phẩm theo ID hoặc slug
const findProduct = async (identifier) => {
  if (!identifier) return null;
  
  // Nếu là số thuần túy thì tìm theo ID
  if (/^\d+$/.test(identifier)) {
    return await Product.findByPk(identifier);
  }
  
  // Nếu không phải số thuần túy, tìm theo slug
  return await Product.findOne({ where: { slug: identifier } });
};

// Chuyển đổi đường dẫn ảnh thành URL đầy đủ
const formatProduct = (product, req) => {
  const p = product.toJSON ? product.toJSON() : product;
  const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
  
  if (p.images && Array.isArray(p.images)) {
    p.images = p.images.map(img => img.startsWith("http") ? img : baseUrl + img);
    // Thêm trường image (ảnh đầu tiên) để tương thích với ProductCard
    p.image = p.images[0] || null;
  }
  return p;
};

// Lấy danh sách tất cả sản phẩm
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.findAll();
    const formattedProducts = products.map(p => formatProduct(p, req));
    res.status(200).json(formattedProducts);
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", err });
  }
};

// Lấy thông tin chi tiết sản phẩm theo ID hoặc slug
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await findProduct(id);
    
    if (!product) {
      return res.status(404).json({ msg: "Sản phẩm không tồn tại" });
    }
    res.status(200).json(formatProduct(product, req));
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", err });
  }
};

// Thêm sản phẩm mới (chỉ Admin)
exports.createProduct = async (req, res) => {
  try {
    const { 
      name, description, price, oldPrice, category, stock, brand, usage,
      cpuType, ramCapacity, ramType, ramSlots, storage, battery, gpuType,
      screenSize, screenTechnology, screenResolution, os, ports, otherSpecs
    } = req.body;
    const images = req.files?.length > 0 ? req.files.map(file => file.filename) : [];

    let slug = createSlug(name);
    const existingSlug = await Product.findOne({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const newProduct = await Product.create({
      name, slug, description, price, oldPrice, category, stock, brand, usage, images,
      cpuType, ramCapacity, ramType, ramSlots, storage, battery, gpuType,
      screenSize, screenTechnology, screenResolution, os, ports, otherSpecs
    });

    res.status(201).json({ msg: "Thêm sản phẩm thành công", product: formatProduct(newProduct, req) });
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", err });
  }
};

// Cập nhật thông tin sản phẩm (chỉ Admin)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, description, price, oldPrice, category, stock, keptImages, brand, usage,
      cpuType, ramCapacity, ramType, ramSlots, storage, battery, gpuType,
      screenSize, screenTechnology, screenResolution, os, ports, otherSpecs
    } = req.body;
    
    const product = await findProduct(id);
    if (!product) {
      return res.status(404).json({ msg: "Sản phẩm không tồn tại" });
    }

    let currentImages = product.images || [];
    if (typeof currentImages === 'string') {
        try { currentImages = JSON.parse(currentImages); } catch(e) { currentImages = []; }
    }
    if (!Array.isArray(currentImages)) currentImages = [];

    let imagesToKeep = currentImages;
    if (keptImages !== undefined) {
        const keptList = Array.isArray(keptImages) ? keptImages : [keptImages];
        imagesToKeep = keptList.map(img => path.basename(img));
    }
    
    const imagesToDelete = currentImages.filter(img => !imagesToKeep.includes(img));
    imagesToDelete.forEach(img => {
        const filePath = path.join(__dirname, "../uploads/", img);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

    const newImages = req.files?.length > 0 ? req.files.map(file => file.filename) : [];
    const finalImages = [...imagesToKeep, ...newImages];

    const updateData = {
      name, description, price, oldPrice, category, stock, brand, usage,
      images: finalImages,
      cpuType, ramCapacity, ramType, ramSlots, storage, battery, gpuType,
      screenSize, screenTechnology, screenResolution, os, ports, otherSpecs
    };

    if (name && name !== product.name) {
      let newSlug = createSlug(name);
      const existingSlug = await Product.findOne({ where: { slug: newSlug } });
      if (existingSlug && existingSlug.id !== product.id) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      updateData.slug = newSlug;
    }

    await product.update(updateData);

    res.status(200).json({ msg: "Cập nhật sản phẩm thành công", product: formatProduct(product, req) });
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", err });
  }
};

// Xóa sản phẩm (chỉ Admin)
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await findProduct(id);
    
    if (!product) {
      return res.status(404).json({ msg: "Sản phẩm không tồn tại" });
    }

    let images = product.images || [];
    if (typeof images === 'string') {
        try { images = JSON.parse(images); } catch(e) { images = []; }
    }
    
    if (Array.isArray(images)) {
        images.forEach(img => {
            const imagePath = path.join(__dirname, "../uploads/", img);
            if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        });
    }

    await product.destroy();
    res.status(200).json({ msg: "Xóa sản phẩm thành công" });
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", err });
  }
};
