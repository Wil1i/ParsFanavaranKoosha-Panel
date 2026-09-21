const { Purchase, Item, Batch, Payment, sequelize } = require("../models");
const { logActivity } = require("../utils/activityLogger");
const { sanitizePayments } = require("../utils/payments");

async function findOrCreateItem(name, unit, t) {
  const existing = await Item.findOne({
    where: sequelize.where(
      sequelize.fn("LOWER", sequelize.col("name")),
      name.trim().toLowerCase()
    ),
    transaction: t,
  });
  if (existing) return existing;
  return Item.create({ name: name.trim(), unit, stock: 0 }, { transaction: t });
}

exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.batchId) where.batchId = req.query.batchId;
    const purchases = await Purchase.findAll({
      where, order: [["date", "DESC"]],
      include: [{ model: Payment, as: "payments" }],
    });
    res.json(purchases);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { batchId, date, itemName, qty, unit, unitPrice, supplier, payments, note } = req.body;
    if (!batchId || !date || !itemName || !qty || !unitPrice) {
      await t.rollback();
      return res.status(400).json({ message: "کشت، تاریخ، نام کالا، مقدار و قیمت واحد الزامی است." });
    }

    const batch = await Batch.findByPk(batchId, { transaction: t });
    if (!batch) {
      await t.rollback();
      return res.status(404).json({ message: "کشت یافت نشد." });
    }

    const item = await findOrCreateItem(itemName, unit || "کیلوگرم", t);
    item.stock = Number(item.stock) + Number(qty);
    await item.save({ transaction: t });

    const cleanPayments = sanitizePayments(payments);
    const paidAmount = cleanPayments.reduce((s, p) => s + p.amount, 0);

    const purchase = await Purchase.create({
      batchId,
      itemId: item.id,
      itemName: item.name,
      date,
      qty,
      unit: unit || item.unit,
      unitPrice,
      total: Number(qty) * Number(unitPrice),
      paidAmount,
      supplier: supplier || null,
      note: note || null,
    }, { transaction: t });

    if (cleanPayments.length > 0) {
      await Payment.bulkCreate(
        cleanPayments.map((p) => ({ ...p, purchaseId: purchase.id })),
        { transaction: t }
      );
    }

    await t.commit();
    const methodsSummary = cleanPayments.map((p) => `${p.method}: ${p.amount.toLocaleString("fa-IR")} تومان`).join("، ");
    await logActivity({
      user: req.user, action: "PURCHASE_CREATE", entityType: "purchase", entityId: purchase.id,
      description: `فاکتور خرید «${item.name}» (${qty} ${purchase.unit}، ${purchase.total.toLocaleString("fa-IR")} تومان${methodsSummary ? `، پرداخت: ${methodsSummary}` : ""}) برای کشت «${batch.name}» ثبت شد.`,
    });
    const full = await Purchase.findByPk(purchase.id, { include: [{ model: Payment, as: "payments" }] });
    res.status(201).json(full);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.update = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const purchase = await Purchase.findByPk(req.params.id, { transaction: t });
    if (!purchase) {
      await t.rollback();
      return res.status(404).json({ message: "فاکتور خرید یافت نشد." });
    }

    // revert previous stock effect
    if (purchase.itemId) {
      const prevItem = await Item.findByPk(purchase.itemId, { transaction: t });
      if (prevItem) {
        prevItem.stock = Number(prevItem.stock) - Number(purchase.qty);
        await prevItem.save({ transaction: t });
      }
    }

    const { date, itemName, qty, unit, unitPrice, supplier, payments, note } = req.body;
    const finalItemName = itemName !== undefined ? itemName : purchase.itemName;
    const finalUnit = unit !== undefined ? unit : purchase.unit;
    const finalQty = qty !== undefined ? qty : purchase.qty;
    const finalUnitPrice = unitPrice !== undefined ? unitPrice : purchase.unitPrice;

    const item = await findOrCreateItem(finalItemName, finalUnit, t);
    item.stock = Number(item.stock) + Number(finalQty);
    await item.save({ transaction: t });

    purchase.itemId = item.id;
    purchase.itemName = item.name;
    purchase.date = date !== undefined ? date : purchase.date;
    purchase.qty = finalQty;
    purchase.unit = finalUnit;
    purchase.unitPrice = finalUnitPrice;
    purchase.total = Number(finalQty) * Number(finalUnitPrice);
    if (supplier !== undefined) purchase.supplier = supplier;
    if (note !== undefined) purchase.note = note;

    if (payments !== undefined) {
      const cleanPayments = sanitizePayments(payments);
      await Payment.destroy({ where: { purchaseId: purchase.id }, transaction: t });
      if (cleanPayments.length > 0) {
        await Payment.bulkCreate(
          cleanPayments.map((p) => ({ ...p, purchaseId: purchase.id })),
          { transaction: t }
        );
      }
      purchase.paidAmount = cleanPayments.reduce((s, p) => s + p.amount, 0);
    }

    await purchase.save({ transaction: t });

    await t.commit();
    await logActivity({
      user: req.user, action: "PURCHASE_UPDATE", entityType: "purchase", entityId: purchase.id,
      description: `فاکتور خرید «${purchase.itemName}» (${purchase.total.toLocaleString("fa-IR")} تومان) ویرایش شد.`,
    });
    const full = await Purchase.findByPk(purchase.id, { include: [{ model: Payment, as: "payments" }] });
    res.json(full);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const purchase = await Purchase.findByPk(req.params.id, { transaction: t });
    if (!purchase) {
      await t.rollback();
      return res.status(404).json({ message: "فاکتور خرید یافت نشد." });
    }
    if (purchase.itemId) {
      const item = await Item.findByPk(purchase.itemId, { transaction: t });
      if (item) {
        item.stock = Math.max(0, Number(item.stock) - Number(purchase.qty));
        await item.save({ transaction: t });
      }
    }
    await Payment.destroy({ where: { purchaseId: purchase.id }, transaction: t });
    await purchase.destroy({ transaction: t });
    await t.commit();
    await logActivity({
      user: req.user, action: "PURCHASE_DELETE", entityType: "purchase", entityId: purchase.id,
      description: `فاکتور خرید «${purchase.itemName}» (${Number(purchase.total).toLocaleString("fa-IR")} تومان) حذف شد.`,
    });
    res.status(204).send();
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
