const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const sequelize = require("../config/db");

const User = sequelize.define("User", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fullName: {
    type: DataTypes.STRING(150),
    allowNull: false,
    field: "full_name",
  },
  username: {
    type: DataTypes.STRING(60),
    allowNull: false,
    unique: true,
  },
  password: {
    // stores the bcrypt hash
    type: DataTypes.STRING(120),
    allowNull: false,
  },
  role: {
    // سمت سازمانی
    type: DataTypes.STRING(120),
    allowNull: true,
  },
  canAccessBatches: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: "can_access_batches",
  },
  canAccessWarehouse: {
    // دسترسی پایه انبار: فقط مشاهده لیست و کم کردن موجودی
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: "can_access_warehouse",
  },
  isWarehouseManager: {
    // دسترسی کامل انبار: افزودن/ویرایش/حذف کالا و افزایش/کاهش موجودی
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: "is_warehouse_manager",
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: "is_admin",
  },
}, {
  tableName: "users",
  defaultScope: {
    attributes: { exclude: ["password"] },
  },
  scopes: {
    withPassword: { attributes: {} },
  },
  hooks: {
    beforeCreate: async (user) => {
      user.password = await bcrypt.hash(user.password, 10);
    },
    beforeUpdate: async (user) => {
      if (user.changed("password")) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

User.prototype.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = User;
