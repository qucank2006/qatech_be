require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const sequelize = require("./src/config/db");

const authRoutes = require("./src/routes/auth");
const productRoutes = require("./src/routes/product");
const reviewRoutes = require("./src/routes/review");
const orderRoutes = require("./src/routes/order");
const dashboardRoutes = require("./src/routes/dashboard");
const userRoutes = require("./src/routes/user");
const paymentRoutes = require("./src/routes/payment");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);

// Kết nối DB + chạy server
// Sử dụng sync() thay vì alter: true để tránh lỗi "too many keys"
sequelize.sync().then(() => {
  console.log("Database connected");

  app.listen(process.env.PORT, () => {
    console.log("Server running on port " + process.env.PORT);
  });
}).catch(err => {
  console.error("Database connection error:", err.message);
});
