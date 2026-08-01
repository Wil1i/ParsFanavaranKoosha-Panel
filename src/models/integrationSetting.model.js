const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

/**
 * تنظیمات اتصال به فروشگاه ووکامرس/وردپرس.
 * فعلاً فقط یک ردیف از این جدول استفاده می‌شود (تک‌فروشگاهی).
 */
const IntegrationSetting = sequelize.define("IntegrationSetting", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  provider: {
    // فعلاً فقط "woocommerce"؛ برای امکان افزودن درگاه‌های دیگر در آینده
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: "woocommerce",
  },
  siteUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: "site_url",
  },
  consumerKey: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: "consumer_key",
  },
  consumerSecret: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: "consumer_secret",
  },
  isConnected: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: "is_connected",
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: "last_sync_at",
  },
  lastSyncStatus: {
    // "success" | "error"
    type: DataTypes.STRING(20),
    allowNull: true,
    field: "last_sync_status",
  },
  lastSyncMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: "last_sync_message",
  },
  lastSyncCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: "last_sync_count",
  },
}, {
  tableName: "integration_settings",
});

module.exports = IntegrationSetting;
