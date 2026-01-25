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
  validateMonitorSpecs,
  normalizeImagePath
} = require("../utils/helpers");

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


const formatProduct = (product, req) => {
  const p = product.toJSON ? product.toJSON() : product;
  const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
  

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
      

      const primaryImage = p.images.find(img => img.isPrimary);
      p.image = primaryImage ? primaryImage.url : (p.images[0]?.url || null);
    } else {
      p.images = [];
      p.image = null;
    }
  

  if (p.specifications) {
    p.cpuType = p.specifications.cpuType;
    p.ramCapacity = p.specifications.ramCapacity;
    p.ramType = p.specifications.ramType;
    p.storage = p.specifications.storage;
    p.gpuType = p.specifications.gpuType;
    p.screenSize = p.specifications.screenSize;
    p.screenResolution = p.specifications.screenResolution;
    

    const specsValue = p.specifications.specs;
    

    if (specsValue) {

      if (typeof specsValue === 'object' && !Array.isArray(specsValue)) {

        const specsKeys = Object.keys(specsValue);
        if (specsKeys.length > 0) {

          p.specs = specsValue;
        } else {

          p.specs = {};
        }
      } else if (typeof specsValue === 'string') {

        try {
          const parsed = JSON.parse(specsValue);
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            p.specs = parsed;
          } else {
            p.specs = {};
          }
        } catch (e) {
          p.specs = {};
        }
      } else {

        p.specs = {};
      }
    } else {

      p.specs = {};
    }
    

  } else {

    p.specs = {};
  }
  
  return p;
};
exports.getAllProducts = async (req, res) => {
  try {
    const { category, brand, type, subCategory } = req.query;
    

    const whereClause = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (brand) {
      whereClause.brand = brand;
    }
    

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
          required: false
        }
      ]
    });
    
    const formattedProducts = products.map(p => formatProduct(p, req));
    res.status(200).json(formattedProducts);
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", err });
  }
};
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await findProduct(id);
    
    if (!product) {
      return res.status(404).json({ msg: "Sản phẩm không tồn tại" });
    }
    

    const formattedProduct = formatProduct(product, req);
    

    if (!formattedProduct.specs || typeof formattedProduct.specs !== 'object' || Array.isArray(formattedProduct.specs)) {
      formattedProduct.specs = {};
    }
    
    res.status(200).json(formattedProduct);
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", err });
  }
};
exports.createProduct = async (req, res) => {
  try {
    const { 
      name, description, price, oldPrice, category, stock, brand, usage,
      cpuType, ramCapacity, ramType, ramSlots, storage, battery, gpuType,
      screenSize, screenTechnology, screenResolution, os, ports, otherSpecs,
      type, subCategory, specs,

      monitorSize, panelType, aspectRatio, refreshRate, responseTime, vesa, resolution
    } = req.body;
    
    const uploadedFiles = req.files?.length > 0 ? req.files.map(file => file.filename) : [];

    let slug = createSlug(name);
    const existingSlug = await Product.findOne({ where: { slug } });
    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }






    let parsedSpecs = {};
    


    if (specs !== undefined && specs !== null && specs !== '') {
        try {

            if (typeof specs === 'string') {
                const parsed = JSON.parse(specs);
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {

                    parsedSpecs = { ...parsed };
                }
            } else if (typeof specs === 'object' && !Array.isArray(specs)) {

                parsedSpecs = { ...specs };
            }
        } catch (e) {

        }
    }
    

    const isMonitor = category === 'man-hinh' || category === 'monitor' || subCategory === 'monitor';
    const hasMonitorSpecsFields = monitorSize || panelType || aspectRatio || refreshRate || 
                                  responseTime || vesa || ports || resolution;
    
    if (hasMonitorSpecsFields) {
        if (isMonitor) {

            const monitorSpecs = formatMonitorSpecs(req.body);

            Object.keys(monitorSpecs).forEach(key => {
                const value = monitorSpecs[key];
                if (value !== undefined && value !== null && value !== '' && 
                    (Array.isArray(value) ? value.length > 0 : true)) {

                    if (!(key in parsedSpecs)) {
                        parsedSpecs[key] = value;
                    }
                }
            });
            

            if (!validateMonitorSpecs(monitorSpecs)) {
                return res.status(400).json({ 
                    msg: "Thông số màn hình không hợp lệ. Cần có: kích thước và độ phân giải" 
                });
            }
        } else {

            if (monitorSize && monitorSize.toString().trim() && !('monitorSize' in parsedSpecs)) {
                parsedSpecs.monitorSize = typeof monitorSize === 'string' ? monitorSize.trim() : monitorSize;
            }
            if (panelType && panelType.toString().trim() && !('panelType' in parsedSpecs)) {
                parsedSpecs.panelType = typeof panelType === 'string' ? panelType.trim() : panelType;
            }
            if (aspectRatio && aspectRatio.toString().trim() && !('aspectRatio' in parsedSpecs)) {
                parsedSpecs.aspectRatio = typeof aspectRatio === 'string' ? aspectRatio.trim() : aspectRatio;
            }
            if (refreshRate && refreshRate.toString().trim() && !('refreshRate' in parsedSpecs)) {
                parsedSpecs.refreshRate = typeof refreshRate === 'string' ? refreshRate.trim() : refreshRate;
            }
            if (responseTime && responseTime.toString().trim() && !('responseTime' in parsedSpecs)) {
                parsedSpecs.responseTime = typeof responseTime === 'string' ? responseTime.trim() : responseTime;
            }
            if (vesa && vesa.toString().trim() && !('vesa' in parsedSpecs)) {
                parsedSpecs.vesa = typeof vesa === 'string' ? vesa.trim() : vesa;
            }
            if (ports && ports.toString().trim() && !('ports' in parsedSpecs)) {
                parsedSpecs.ports = typeof ports === 'string' ? ports.trim() : ports;
            }
            if (resolution && resolution.toString().trim() && !('resolution' in parsedSpecs)) {
                parsedSpecs.resolution = typeof resolution === 'string' ? resolution.trim() : resolution;
            }
        }
    }
    



    const basicFields = [
        'name', 'description', 'price', 'oldPrice', 'category', 'subCategory', 
        'stock', 'brand', 'usage', 'type', 'specs'
    ];
    

    const laptopSpecsFields = [
        'cpuType', 'ramCapacity', 'ramType', 'ramSlots', 'storage', 'battery', 
        'gpuType', 'screenSize', 'screenTechnology', 'screenResolution', 'os', 
        'ports', 'otherSpecs'
    ];
    

    const monitorSpecsFields = [
        'monitorSize', 'panelType', 'aspectRatio', 'refreshRate', 'responseTime', 'vesa', 'resolution'
    ];
    


    laptopSpecsFields.forEach(key => {
        const value = req.body[key];
        if (value !== undefined && value !== null && value !== '' && !(key in parsedSpecs)) {
            const trimmedValue = typeof value === 'string' ? value.trim() : value;
            if (trimmedValue) {
                parsedSpecs[key] = trimmedValue;
            }
        }
    });
    

    Object.keys(req.body).forEach(key => {

        if (!basicFields.includes(key) && 
            !laptopSpecsFields.includes(key) && 
            !monitorSpecsFields.includes(key) &&
            req.body[key] !== undefined && 
            req.body[key] !== null && 
            req.body[key] !== '') {
            const value = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];

            if (value && !(key in parsedSpecs)) {
                parsedSpecs[key] = value;
            }
        }
    });


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
      subCategory: subCategory || type || ''
    });


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


    const productWithDetails = await findProduct(newProduct.id);

    res.status(201).json({ 
      msg: "Thêm sản phẩm thành công", 
      product: formatProduct(productWithDetails, req) 
    });
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, description, price, oldPrice, category, stock, keptImages, brand, usage,
      cpuType, ramCapacity, ramType, ramSlots, storage, battery, gpuType,
      screenSize, screenTechnology, screenResolution, os, ports, otherSpecs,
      type, subCategory, specs, primaryImage,

      monitorSize, panelType, aspectRatio, refreshRate, responseTime, vesa, resolution
    } = req.body;
    
    const product = await findProduct(id);
    if (!product) {
      return res.status(404).json({ msg: "Sản phẩm không tồn tại" });
    }


    const currentImages = await ProductImage.findAll({ 
      where: { productId: product.id },
      order: [['order', 'ASC']]
    });






    let imagesToKeepNormalized = [];
    let keptImagesOrder = [];
    
    if (keptImages !== undefined && keptImages !== null) {

        if (keptImages === '') {
            imagesToKeepNormalized = currentImages.map(img => normalizeImagePath(img.imageUrl));
            keptImagesOrder = imagesToKeepNormalized;
        } else {
            try {

                const parsedKept = typeof keptImages === 'string' ? JSON.parse(keptImages) : keptImages;
                

                const keptList = Array.isArray(parsedKept) ? parsedKept : [parsedKept];
                

                imagesToKeepNormalized = keptList
                    .filter(img => img && typeof img === 'string')
                    .map(img => normalizeImagePath(img));
                

                keptImagesOrder = imagesToKeepNormalized;
            } catch (e) {

                imagesToKeepNormalized = currentImages.map(img => normalizeImagePath(img.imageUrl));
                keptImagesOrder = imagesToKeepNormalized;
            }
        }
    } else {

        imagesToKeepNormalized = currentImages.map(img => normalizeImagePath(img.imageUrl));
        keptImagesOrder = imagesToKeepNormalized;
    }
    

    const imagesToDelete = [];
    await Promise.all(
      currentImages.map(async (img) => {
        const normalizedCurrentPath = normalizeImagePath(img.imageUrl);
        const shouldKeep = imagesToKeepNormalized.includes(normalizedCurrentPath);
        
        if (!shouldKeep) {
          imagesToDelete.push(img.imageUrl);

          const filePath = path.join(__dirname, "../uploads/", img.imageUrl);
          deleteFile(filePath);

          await img.destroy();
        }
      })
    );
    

    const newFiles = req.files?.length > 0 ? req.files.map(file => file.filename) : [];
    
    if (newFiles.length > 0) {

        const remainingImages = await ProductImage.findAll({ 
          where: { productId: product.id },
          order: [['order', 'ASC']]
        });
        
        const maxOrder = remainingImages.length > 0 
            ? Math.max(...remainingImages.map(img => img.order)) 
            : -1;
        

        const imagePromises = newFiles.map((filename, index) => 
            ProductImage.create({
                productId: product.id,
                imageUrl: filename,
                isPrimary: false,
                order: maxOrder + index + 1,
                alt: `${name || product.name} - Ảnh ${maxOrder + index + 2}`
            })
        );
        await Promise.all(imagePromises);
        

        await new Promise(resolve => setTimeout(resolve, 100));
    }







    const allImages = await ProductImage.findAll({ 
      where: { productId: product.id },
      order: [['order', 'ASC']]
    });
    
    if (allImages.length > 0) {

        await ProductImage.update(
            { isPrimary: false },
            { where: { productId: product.id } }
        );
        
        let primaryImageToSet = null;
        

        let primaryImageToCheck = primaryImage;
        if (!primaryImageToCheck || primaryImageToCheck === '') {
            primaryImageToCheck = req.body.primaryImage;
        }
        
        if (primaryImageToCheck !== undefined && primaryImageToCheck !== null && primaryImageToCheck !== '') {
            try {

                let parsedPrimary = primaryImageToCheck;
                if (typeof primaryImageToCheck === 'string') {

                    if (primaryImageToCheck.startsWith('{') || primaryImageToCheck.startsWith('[')) {
                        parsedPrimary = JSON.parse(primaryImageToCheck);
                    } else {

                        parsedPrimary = primaryImageToCheck;
                    }
                }
                

                const primaryPathString = typeof parsedPrimary === 'string' ? parsedPrimary : String(parsedPrimary);
                const normalizedPrimaryPath = normalizeImagePath(primaryPathString);
                

                primaryImageToSet = allImages.find(img => {
                    const normalizedImgPath = normalizeImagePath(img.imageUrl);
                    return normalizedImgPath === normalizedPrimaryPath;
                });
            } catch (e) {

            }
        }
        

        if (!primaryImageToSet && keptImagesOrder.length > 0) {
            const firstKeptImageNormalized = keptImagesOrder[0];
            const firstKeptImage = allImages.find(img => {
                const normalizedImgPath = normalizeImagePath(img.imageUrl);
                return normalizedImgPath === firstKeptImageNormalized;
            });
            
            if (firstKeptImage) {
                primaryImageToSet = firstKeptImage;
            }
        }
        

        if (!primaryImageToSet && allImages.length > 0) {
            primaryImageToSet = allImages[0];
        }
        

        if (primaryImageToSet) {

            await ProductImage.update(
                { isPrimary: true },
                { 
                    where: { 
                        productId: product.id,
                        imageUrl: primaryImageToSet.imageUrl
                    }
                }
            );
            

            await primaryImageToSet.reload();
            

            const verifyPrimary = await ProductImage.findOne({
                where: {
                    productId: product.id,
                    imageUrl: primaryImageToSet.imageUrl
                }
            });
            
            if (verifyPrimary && !verifyPrimary.isPrimary) {

                await verifyPrimary.update({ isPrimary: true });
                await verifyPrimary.reload();
            }
        }
    }






    let parsedSpecs = {};
    



    if (specs !== undefined && specs !== null && specs !== '') {
        try {

            if (typeof specs === 'string') {

                let parsed;
                try {
                    parsed = JSON.parse(specs);
                } catch (parseError) {

                    parsed = null;
                }
                
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {

                    parsedSpecs = { ...parsed };
                }
            } else if (typeof specs === 'object' && !Array.isArray(specs)) {

                parsedSpecs = { ...specs };
            }
        } catch (e) {

        }
    }
    

    const isMonitor = category === 'man-hinh' || category === 'monitor' || subCategory === 'monitor';
    const hasMonitorSpecsFields = monitorSize || panelType || aspectRatio || refreshRate || 
                                  responseTime || vesa || ports || resolution;
    
    if (hasMonitorSpecsFields) {
        if (isMonitor) {

            const monitorSpecs = formatMonitorSpecs(req.body);

            Object.keys(monitorSpecs).forEach(key => {
                const value = monitorSpecs[key];
                if (value !== undefined && value !== null && value !== '' && 
                    (Array.isArray(value) ? value.length > 0 : true)) {

                    if (!(key in parsedSpecs)) {
                        parsedSpecs[key] = value;
                    }
                }
            });
        } else {

            if (monitorSize && monitorSize.toString().trim() && !('monitorSize' in parsedSpecs)) {
                parsedSpecs.monitorSize = typeof monitorSize === 'string' ? monitorSize.trim() : monitorSize;
            }
            if (panelType && panelType.toString().trim() && !('panelType' in parsedSpecs)) {
                parsedSpecs.panelType = typeof panelType === 'string' ? panelType.trim() : panelType;
            }
            if (aspectRatio && aspectRatio.toString().trim() && !('aspectRatio' in parsedSpecs)) {
                parsedSpecs.aspectRatio = typeof aspectRatio === 'string' ? aspectRatio.trim() : aspectRatio;
            }
            if (refreshRate && refreshRate.toString().trim() && !('refreshRate' in parsedSpecs)) {
                parsedSpecs.refreshRate = typeof refreshRate === 'string' ? refreshRate.trim() : refreshRate;
            }
            if (responseTime && responseTime.toString().trim() && !('responseTime' in parsedSpecs)) {
                parsedSpecs.responseTime = typeof responseTime === 'string' ? responseTime.trim() : responseTime;
            }
            if (vesa && vesa.toString().trim() && !('vesa' in parsedSpecs)) {
                parsedSpecs.vesa = typeof vesa === 'string' ? vesa.trim() : vesa;
            }
            if (ports && ports.toString().trim() && !('ports' in parsedSpecs)) {
                parsedSpecs.ports = typeof ports === 'string' ? ports.trim() : ports;
            }
            if (resolution && resolution.toString().trim() && !('resolution' in parsedSpecs)) {
                parsedSpecs.resolution = typeof resolution === 'string' ? resolution.trim() : resolution;
            }
        }
    }
    



    const basicFields = [
        'name', 'description', 'price', 'oldPrice', 'category', 'subCategory', 
        'stock', 'brand', 'usage', 'keptImages', 'primaryImage', 'primaryImageIndex',
        'type', 'specs'
    ];
    

    const laptopSpecsFields = [
        'cpuType', 'ramCapacity', 'ramType', 'ramSlots', 'storage', 'battery', 
        'gpuType', 'screenSize', 'screenTechnology', 'screenResolution', 'os', 
        'ports', 'otherSpecs'
    ];
    

    const monitorSpecsFields = [
        'monitorSize', 'panelType', 'aspectRatio', 'refreshRate', 'responseTime', 'vesa', 'resolution'
    ];
    


    laptopSpecsFields.forEach(key => {
        const value = req.body[key];
        if (value !== undefined && value !== null && value !== '' && !(key in parsedSpecs)) {
            const trimmedValue = typeof value === 'string' ? value.trim() : value;
            if (trimmedValue) {
                parsedSpecs[key] = trimmedValue;
            }
        }
    });
    

    Object.keys(req.body).forEach(key => {

        if (!basicFields.includes(key) && 
            !laptopSpecsFields.includes(key) && 
            !monitorSpecsFields.includes(key) &&
            req.body[key] !== undefined && 
            req.body[key] !== null && 
            req.body[key] !== '') {
            const value = typeof req.body[key] === 'string' ? req.body[key].trim() : req.body[key];

            if (value && !(key in parsedSpecs)) {
                parsedSpecs[key] = value;
            }
        }
    });
    



    if (Object.keys(parsedSpecs).length === 0) {

        const currentSpecs = product.specifications?.specs;
        if (currentSpecs && typeof currentSpecs === 'object' && !Array.isArray(currentSpecs) && Object.keys(currentSpecs).length > 0) {

            parsedSpecs = undefined;
        } else {




            if (specs === undefined || specs === null || specs === '') {

                parsedSpecs = undefined;
            }
        }
    }


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
      type: type || subCategory || undefined
    });
    


    if (parsedSpecs !== undefined && Object.keys(parsedSpecs).length > 0) {
        specUpdateData.specs = parsedSpecs;
    }


    if (Object.keys(specUpdateData).length > 0) {

        const existingSpec = await ProductSpecification.findOne({
          where: { productId: product.id }
        });
        
        if (existingSpec) {

            const updateResult = await ProductSpecification.update(specUpdateData, {
              where: { productId: product.id }
            });
            
            if (updateResult[0] === 0) {

                await existingSpec.update(specUpdateData);
                await existingSpec.reload();
            }
        } else {

            await ProductSpecification.create({
              productId: product.id,
              ...specUpdateData
            });
        }
    }


    const updatedProduct = await findProduct(product.id);

    res.status(200).json({ 
      msg: "Cập nhật sản phẩm thành công", 
      product: formatProduct(updatedProduct, req) 
    });
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await findProduct(id);
    
    if (!product) {
      return res.status(404).json({ msg: "Sản phẩm không tồn tại" });
    }


    const images = await ProductImage.findAll({ 
      where: { productId: product.id } 
    });
    

    const imagePaths = images.map(img => 
      path.join(__dirname, "../uploads/", img.imageUrl)
    );
    await Promise.all(imagePaths.map(deleteFile));


    await product.destroy();
    
    res.status(200).json({ 
      msg: "Xóa sản phẩm thành công",
      deletedId: product.id 
    });
  } catch (err) {
    res.status(500).json({ msg: "Lỗi server", error: err.message });
  }
};
