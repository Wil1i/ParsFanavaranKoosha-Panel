const { Item } = require("../models");
const { logActivity } = require("../utils/activityLogger");

exports.list = async (req, res, next) => {
  try {
    const items = await Item.findAll({ order: [["name", "ASC"]] });
    res.json(items);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, unit, stock, location } = req.body;
    if (!name) return res.status(400).json({ message: "نام کالا الزامی است." });
    const item = await Item.create({ name, unit: unit || "کیلوگرم", stock: stock || 0, location: location || null });
    await logActivity({
      user: req.user, action: "ITEM_CREATE", entityType: "item", entityId: item.id,
      description: `کالای انبار «${item.name}» با موجودی اولیه ${item.stock} ${item.unit} ایجاد شد.`,
    });
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "کالا یافت نشد." });

    const { name, unit, stock, location } = req.body;
    if (name !== undefined) item.name = name;
    if (unit !== undefined) item.unit = unit;
    if (stock !== undefined) item.stock = stock;
    if (location !== undefined) item.location = location;
    await item.save();

    await logActivity({
      user: req.user, action: "ITEM_UPDATE", entityType: "item", entityId: item.id,
      description: `کالای انبار «${item.name}» ویرایش شد.`,
    });

    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "کالا یافت نشد." });
    await item.destroy();
    await logActivity({
      user: req.user, action: "ITEM_DELETE", entityType: "item", entityId: item.id,
      description: `کالای انبار «${item.name}» حذف شد.`,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// increment/decrement stock manually, e.g. body: { delta: 1 } or { delta: -1 }
exports.adjustStock = async (req, res, next) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ message: "کالا یافت نشد." });

    const delta = Number(req.body.delta || 0);
    item.stock = Math.max(0, Number(item.stock) + delta);
    await item.save();

    await logActivity({
      user: req.user, action: "ITEM_STOCK_ADJUST", entityType: "item", entityId: item.id,
      description: `موجودی کالای «${item.name}» به میزان ${delta > 0 ? "+" : ""}${delta} تغییر کرد (موجودی جدید: ${item.stock} ${item.unit}).`,
    });

    res.json(item);
  } catch (err) {
    next(err);
  }
};
