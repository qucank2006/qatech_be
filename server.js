require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const sequelize = require("./src/config/db");

const authRoutes = require("./src/routes/auth");
const productRoutes = require("./src/routes/product");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);

// Kết nối DB + chạy server
sequelize.sync({ alter: true }).then(() => {
  console.log("Database connected");

  app.listen(process.env.PORT, () => {
    console.log("Server running on port " + process.env.PORT);
  });
});
