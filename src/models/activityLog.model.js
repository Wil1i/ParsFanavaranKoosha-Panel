const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ActivityLog = sequelize.define("ActivityLog", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: "user_id",
  },
  // مقادیر کاربر را هم به‌صورت اسنپ‌شات نگه می‌داریم تا اگر بعداً کاربر حذف شد،
  // تاریخچه‌ی لاگ همچنان خوانا بماند.
  username: {
    type: DataTypes.STRING(60),
    allowNull: true,
  },
  fullName: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: "full_name",
  },
  action: {
    // مثلا: BATCH_CREATE, PURCHASE_DELETE, LOGIN, ...
    type: DataTypes.STRING(60),
    allowNull: false,
  },
  entityType: {
    // batch | purchase | sale | item | user | auth
    type: DataTypes.STRING(30),
    allowNull: false,
    field: "entity_type",
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: "entity_id",
  },
  description: {
    // شرح فارسی و خوانا از رخداد، برای نمایش مستقیم در صفحه‌ی لاگ
    type: DataTypes.TEXT,
    allowNull: false,
  },
  meta: {
    // جزئیات تکمیلی به‌صورت JSON رشته‌ای (اختیاری)
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: "activity_logs",
  updatedAt: false,
});

module.exports = ActivityLog;
