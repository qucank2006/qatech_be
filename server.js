require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sequelize = require("./src/config/db");

const authRoutes = require("./src/routes/auth");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Kết nối DB + chạy server
sequelize.sync().then(() => {
  console.log("Database connected");

  app.listen(process.env.PORT, () => {
    console.log("Server running on port " + process.env.PORT);
  });
});
