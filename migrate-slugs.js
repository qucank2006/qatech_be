require("dotenv").config();
const sequelize = require("./src/config/db");
const Product = require("./src/models/Product");

const createSlug = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const migrateSlug = async () => {
  try {
    await sequelize.sync();
    
    const products = await Product.findAll();
    console.log(`Tìm thấy ${products.length} sản phẩm`);
    
    for (const product of products) {
      if (!product.slug) {
        const slug = createSlug(product.name);
        await product.update({ slug });
        console.log(`Đã tạo slug cho: ${product.name} -> ${slug}`);
      }
    }
    
    console.log("Hoàn thành migration slug!");
    process.exit(0);
  } catch (error) {
    console.error("Lỗi:", error);
    process.exit(1);
  }
};

migrateSlug();
