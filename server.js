require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
const sequelize = require("./src/config/db");

const authRoutes = require("./src/routes/auth");
const productRoutes = require("./src/routes/product");
const reviewRoutes = require("./src/routes/review");
const orderRoutes = require("./src/routes/order");
const dashboardRoutes = require("./src/routes/dashboard");
const userRoutes = require("./src/routes/user");
const paymentRoutes = require("./src/routes/payment");
const cartRoutes = require("./src/routes/cart");

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET || 'qatech-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin/dashboard", dashboardRoutes);
app.use("/api/users", userRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/cart", cartRoutes);

sequelize.sync().then(() => {
  console.log("Database connected");

  app.listen(process.env.PORT, () => {
    console.log("Server running on port " + process.env.PORT);
  });
}).catch(err => {
  console.error("Database connection error:", err.message);
});
