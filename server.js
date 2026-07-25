require("dotenv").config();
const app = require("./src/app");
const { sequelize, User } = require("./src/models");

const PORT = process.env.PORT || 4000;

async function bootstrapAdmin() {
  const adminExists = await User.findOne({ where: { isAdmin: true } });
  if (adminExists) return;

  const username = process.env.BOOTSTRAP_ADMIN_USERNAME || "admin";
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "Admin@12345";

  await User.create({
    fullName: process.env.BOOTSTRAP_ADMIN_FULLNAME || "مدیر سیستم",
    username,
    password,
    role: "مدیر سیستم",
    isAdmin: true,
    canAccessBatches: true,
    canAccessWarehouse: true,
  });

  console.log(`Bootstrap admin created -> username: ${username} / password: ${password}`);
  console.log("لطفاً پس از اولین ورود، کلمه عبور را تغییر دهید.");
}

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established.");

    // NOTE: sync({ alter: true }) is convenient for development.
    // For production, prefer proper Sequelize migrations instead.
    await sequelize.sync({ alter: true });
    console.log("Models synchronized.");

    await bootstrapAdmin();

    app.listen(PORT, () => {
      console.log(`Compost backend running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
