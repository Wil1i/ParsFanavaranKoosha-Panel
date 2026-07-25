const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Batch = sequelize.define("Batch", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: "start_date",
  },
  readyDays: {
    // تعداد روز تا آماده شدن
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 0 },
    field: "ready_days",
  },
  productionQty: {
    // مقدار تولید پیش‌بینی/واقعی
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    field: "production_qty",
  },
  unit: {
    type: DataTypes.STRING(30),
    allowNull: false,
    defaultValue: "کیلوگرم",
  },
  note: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: "batches",
});

module.exports = Batch;
