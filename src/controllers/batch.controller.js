const { Batch, Purchase, Sale, sequelize } = require("../models");
const { batchMeta } = require("../utils/batchMeta");
const { logActivity } = require("../utils/activityLogger");

async function computeTotals(batchId) {
  const [purchaseCost, soldQty, revenue] = await Promise.all([
    Purchase.sum("total", { where: { batchId } }),
    Sale.sum("qty", { where: { batchId } }),
    Sale.sum("total", { where: { batchId } }),
  ]);
  return {
    purchaseCost: purchaseCost || 0,
    soldQty: soldQty || 0,
    revenue: revenue || 0,
  };
}

function serializeBatch(batch, totals) {
  const meta = batchMeta(batch);
  const remaining = batch.productionQty - totals.soldQty;
  return {
    ...batch.toJSON(),
    ...meta,
    ...totals,
    remaining,
    profit: totals.revenue - totals.purchaseCost,
  };
}

exports.list = async (req, res, next) => {
  try {
    const batches = await Batch.findAll({ order: [["createdAt", "DESC"]] });
    const withTotals = await Promise.all(
      batches.map(async (b) => serializeBatch(b, await computeTotals(b.id)))
    );
    res.json(withTotals);
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const batch = await Batch.findByPk(req.params.id, {
      include: [
        { model: Purchase, as: "purchases", order: [["date", "DESC"]] },
        { model: Sale, as: "sales", order: [["date", "DESC"]] },
      ],
    });
    if (!batch) return res.status(404).json({ message: "کشت یافت نشد." });
    const totals = await computeTotals(batch.id);
    res.json(serializeBatch(batch, totals));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, startDate, readyDays, productionQty, unit, note } = req.body;
    if (!name || !startDate || readyDays === undefined) {
      return res.status(400).json({ message: "نام کشت، تاریخ شروع و تعداد روز تا آماده شدن الزامی است." });
    }
    const batch = await Batch.create({
      name, startDate, readyDays,
      productionQty: productionQty || 0,
      unit: unit || "کیلوگرم",
      note: note || null,
    });
    await logActivity({
      user: req.user, action: "BATCH_CREATE", entityType: "batch", entityId: batch.id,
      description: `کشت «${batch.name}» ایجاد شد.`,
    });
    res.status(201).json(serializeBatch(batch, { purchaseCost: 0, soldQty: 0, revenue: 0 }));
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const batch = await Batch.findByPk(req.params.id);
    if (!batch) return res.status(404).json({ message: "کشت یافت نشد." });

    const { name, startDate, readyDays, productionQty, unit, note } = req.body;
    if (name !== undefined) batch.name = name;
    if (startDate !== undefined) batch.startDate = startDate;
    if (readyDays !== undefined) batch.readyDays = readyDays;
    if (productionQty !== undefined) batch.productionQty = productionQty;
    if (unit !== undefined) batch.unit = unit;
    if (note !== undefined) batch.note = note;
    await batch.save();

    await logActivity({
      user: req.user, action: "BATCH_UPDATE", entityType: "batch", entityId: batch.id,
      description: `کشت «${batch.name}» ویرایش شد.`,
    });

    const totals = await computeTotals(batch.id);
    res.json(serializeBatch(batch, totals));
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const batch = await Batch.findByPk(req.params.id, { transaction: t });
    if (!batch) {
      await t.rollback();
      return res.status(404).json({ message: "کشت یافت نشد." });
    }
    // purchases/sales are removed via ON DELETE CASCADE at the DB level,
    // but we destroy explicitly too for engines/setups without FK cascade.
    await Purchase.destroy({ where: { batchId: batch.id }, transaction: t });
    await Sale.destroy({ where: { batchId: batch.id }, transaction: t });
    await batch.destroy({ transaction: t });
    await t.commit();
    await logActivity({
      user: req.user, action: "BATCH_DELETE", entityType: "batch", entityId: batch.id,
      description: `کشت «${batch.name}» حذف شد.`,
    });
    res.status(204).send();
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
