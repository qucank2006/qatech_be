const { Product, ProductSpecification, ProductImage } = require("../models/index");
const fs = require("fs");
const path = require("path");
const { Op } = require("sequelize");
const { 
  createSlug, 
  deleteFile, 
  removeUndefined, 
  safeJSONParse,
  formatMonitorSpecs,
  validateMonitorSpecs 
} = require("../utils/helpers");

// Tìm sản phẩm theo ID hoặc slug (bao gồm specifications và images)
const findProduct = async (identifier) => {
  if (!identifier) return null;
  
  const whereClause = /^\d+$/.test(identifier) 
    ? { id: identifier } 
    : { slug: identifier };
  
  return await Product.findOne({
    where: whereClause,
    include: [
      {
        model: ProductSpecification,
        as: 'specifications'
      },
      {
        model: ProductImage,
        as: 'images',
        order: [['order', 'ASC']]
      }
    ]
  });
};

// Chuyển đổi đường dẫn ảnh thành URL đầy đủ
const formatProduct = (product, req) => {
  const p = product.toJSON ? product.toJSON() : product;
  const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
  
  // Format images từ bảng product_images
  if (p.images && Array.isArray(p.images)) {
    p.images = p.images.map(img => {
      const url = img.imageUrl.startsWith("http") 
        ? img.imageUrl 
        : baseUrl + img.imageUrl;
      return {
        url,
        isPrimary: img.isPrimary,
        alt: img.alt
      };
    });
    // Thêm trường image (ảnh chính) để tương thích với ProductCard
    const primaryImage = p.images.find(img => img.isPrimary);
    p.image = primaryImage ? primaryImage.url : (p.images[0]?.url || null);
  } else {
    p.images = [];
    p.image = null;
  }
  
  // Merge specifications vào product
  if (p.specifications) {
    p.cpuType = p.specifications.cpuType;
    p.ramCapacity = p.specifications.ramCapacity;
    p.ramType = p.specifications.ramType;
    p.storage = p.specifications.storage;
    p.gpuType = p.specifications.gpuType;
    p.screenSize = p.specifications.screenSize;
    p.screenResolution = p.specifications.screenResolution;
    p.specs = p.specifications.specs;
    // Giữ lại specifications object để có thể truy cập đầy đủ nếu cần
  }
  
  return p;
};

// Lấy danh sách tất cả sản phẩm
exports.getAllProducts = async (req, res) => {
  try {
    const { category, brand, type, subCategory } = req.query;
    
    // Xây dựng điều kiện lọc
    const whereClause = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (brand) {
      whereClause.brand = brand;
    }
    
    // Ưu tiên subCategory, nếu không có thì dùng type (backward compatibility)
    if (subCategory) {
      whereClause.subCategory = subCategory;
    } else if (type) {
      whereClause.subCategory = type;
    }
    
    const products = await Product.findAll({ 
      where: whereClause,
      include: [
        {
          model: ProductSpecification,
          as: 'specifications'
        },
        {
          model: ProductImage,
          as: 'images',
          order: [['order', 'ASC']],
          where: { isPrimary: true },
          required: false // LEFT JOIN để lấy cả product không có ảnh
        }
      ]
    });
    
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
      screenSize, screenTechnology, screenResolution, os, ports, otherSpecs,
      type, subCategory, specs,
      // Monitor specs
      monitorSize, panelType, aspectRatio, refreshRate, responseTime, vesa, resolution
    } = req.body;
    const uploadedFiles = req.files?.length > 0 ? req.files.map(file => file.filename) : [];

    let slug = createSlug(name);
    const existingSlug = await Product.findOne({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Backend nhận specs dưới dạng JSON string hoặc format cho màn hình
    let parsedSpecs = safeJSONParse(req.body.specs, {});
    
    // Nếu là màn hình (monitor/man-hinh), format specs đặc biệt
    if (category === 'man-hinh' || category === 'monitor' || subCategory === 'monitor') {
      const monitorSpecs = formatMonitorSpecs(req.body);
      if (!validateMonitorSpecs(monitorSpecs)) {
        return res.status(400).json({ 
          msg: "Thông số màn hình không hợp lệ. Cần có: kích thước và độ phân giải" 
        });
      }
      parsedSpecs = monitorSpecs;
    }

    // Tạo sản phẩm (chỉ thông tin cơ bản)
    const newProduct = await Product.create({
      name, 
      slug, 
      description, 
      price, 
      oldPrice, 
      category, 
      stock, 
      brand, 
      usage, 
      subCategory: subCategory || type || '' // Ưu tiên subCategory
    });

    // Tạo specifications
    await ProductSpecification.create(
      removeUndefined({
        productId: newProduct.id,
        cpuType, 
        ramCapacity, 
        ramType, 
        ramSlots, 
        storage, 
        battery, 
        gpuType,
        screenSize, 
        screenTechnology, 
        screenResolution, 
        os, 
        ports, 
        otherSpecs,
        type: type || subCategory,
        specs: parsedSpecs
      })
    );

    // Tạo images
    if (uploadedFiles.length > 0) {
      const imagePromises = uploadedFiles.map((filename, index) => 
        ProductImage.create({
          productId: newProduct.id,
          imageUrl: filename,
          isPrimary: index === 0,
          order: index,
          alt: `${name} - Ảnh ${index + 1}`
        })
      );
      await Promise.all(imagePromises);
    }

    // Load lại product với đầy đủ thông tin
    const productWithDetails = await findProduct(newProduct.id);

    res.status(201).json({ 
      msg: "Thêm sản phẩm thành công", 
      product: formatProduct(productWithDetails, req) 
    });
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};

// Cập nhật thông tin sản phẩm (chỉ Admin)
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, description, price, oldPrice, category, stock, keptImages, brand, usage,
      cpuType, ramCapacity, ramType, ramSlots, storage, battery, gpuType,
      screenSize, screenTechnology, screenResolution, os, ports, otherSpecs,
      type, subCategory, specs
    } = req.body;
    
    const product = await findProduct(id);
    if (!product) {
      return res.status(404).json({ msg: "Sản phẩm không tồn tại" });
    }

    // Lấy danh sách ảnh hiện tại từ bảng product_images
    const currentImages = await ProductImage.findAll({ 
      where: { productId: product.id } 
    });

    // Parse keptImages từ request
    let imagesToKeep = [];
    if (keptImages !== undefined) {
        try {
            const parsedKept = typeof keptImages === 'string' ? JSON.parse(keptImages) : keptImages;
            const keptList = Array.isArray(parsedKept) ? parsedKept : [parsedKept];
            imagesToKeep = keptList.filter(img => img).map(img => path.basename(img));
        } catch (e) {
            imagesToKeep = currentImages.map(img => img.imageUrl);
        }
    } else {
        // Nếu không có keptImages, giữ nguyên tất cả ảnh cũ
        imagesToKeep = currentImages.map(img => img.imageUrl);
    }
    
    // Xóa các ảnh không còn trong danh sách giữ lại
    await Promise.all(
      currentImages.map(async (img) => {
        if (!imagesToKeep.includes(img.imageUrl)) {
          // Xóa file vật lý
          const filePath = path.join(__dirname, "../uploads/", img.imageUrl);
          deleteFile(filePath);
          // Xóa record từ database
          await img.destroy();
        }
      })
    );

    // Thêm ảnh mới (nếu có)
    const newFiles = req.files?.length > 0 ? req.files.map(file => file.filename) : [];
    
    if (newFiles.length > 0) {
        const maxOrder = currentImages.length > 0 
            ? Math.max(...currentImages.map(img => img.order)) 
            : -1;
        
        const imagePromises = newFiles.map((filename, index) => 
            ProductImage.create({
                productId: product.id,
                imageUrl: filename,
                isPrimary: currentImages.length === 0 && index === 0, // Ảnh đầu là primary nếu chưa có ảnh
                order: maxOrder + index + 1,
                alt: `${name || product.name} - Ảnh ${maxOrder + index + 2}`
            })
        );
        await Promise.all(imagePromises);
    }

    // Backend nhận specs dưới dạng JSON string
    const parsedSpecs = safeJSONParse(specs);

    // Cập nhật thông tin cơ bản của product
    const productUpdateData = removeUndefined({
      name, 
      description, 
      price, 
      oldPrice, 
      category, 
      stock, 
      brand, 
      usage,
      subCategory: subCategory || type || undefined
    });

    if (name && name !== product.name) {
      let newSlug = createSlug(name);
      const existingSlug = await Product.findOne({ where: { slug: newSlug } });
      if (existingSlug && existingSlug.id !== product.id) {
        newSlug = `${newSlug}-${Date.now()}`;
      }
      productUpdateData.slug = newSlug;
    }

    await product.update(productUpdateData);

    // Cập nhật specifications
    const specUpdateData = removeUndefined({
      cpuType, 
      ramCapacity, 
      ramType, 
      ramSlots, 
      storage, 
      battery, 
      gpuType,
      screenSize, 
      screenTechnology, 
      screenResolution, 
      os, 
      ports, 
      otherSpecs,
      type: type || subCategory || undefined,
      specs: parsedSpecs
    });

    await ProductSpecification.update(specUpdateData, {
      where: { productId: product.id }
    });

    // Load lại product với đầy đủ thông tin
    const updatedProduct = await findProduct(product.id);

    res.status(200).json({ 
      msg: "Cập nhật sản phẩm thành công", 
      product: formatProduct(updatedProduct, req) 
    });
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", error: err.message });
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

    // Lấy tất cả ảnh của sản phẩm
    const images = await ProductImage.findAll({ 
      where: { productId: product.id } 
    });
    
    // Xóa file vật lý (parallel)
    const imagePaths = images.map(img => 
      path.join(__dirname, "../uploads/", img.imageUrl)
    );
    await Promise.all(imagePaths.map(deleteFile));

    // Xóa sản phẩm (cascade sẽ tự động xóa specifications và images)
    await product.destroy();
    
    res.status(200).json({ 
      msg: "Xóa sản phẩm thành công",
      deletedId: product.id 
    });
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};
