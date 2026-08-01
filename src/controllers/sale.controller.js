const { Sale, Batch } = require("../models");
const { logActivity } = require("../utils/activityLogger");

exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.batchId) where.batchId = req.query.batchId;
    const sales = await Sale.findAll({ where, order: [["date", "DESC"]] });
    res.json(sales);
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { batchId, date, qty, unitPrice, unit, customer, customerId, paidAmount, paymentTrackingNumber, note } = req.body;
    if (!batchId || !date || !qty || !unitPrice) {
      return res.status(400).json({ message: "کشت، تاریخ، مقدار و قیمت واحد الزامی است." });
    }

    const batch = await Batch.findByPk(batchId);
    if (!batch) return res.status(404).json({ message: "کشت یافت نشد." });

    // soft check: warn (but don't block) if selling more than what's currently sellable
    const soldQty = (await Sale.sum("qty", { where: { batchId } })) || 0;
    const remaining = Number(batch.productionQty) - soldQty;
    const warning = Number(qty) > remaining
      ? `مقدار فروش از باقیمانده قابل فروش (${remaining}) بیشتر است.`
      : undefined;

    const total = Number(qty) * Number(unitPrice);
    const sale = await Sale.create({
      batchId, date, qty, unitPrice,
      unit: unit || batch.unit,
      total,
      paidAmount: paidAmount !== undefined ? Number(paidAmount) : 0,
      paymentTrackingNumber: paymentTrackingNumber || null,
      customer: customer || null,
      customerId: customerId || null,
      note: note || null,
    });

    const due = total - Number(sale.paidAmount);
    await logActivity({
      user: req.user, action: "SALE_CREATE", entityType: "sale", entityId: sale.id,
      description: `فاکتور فروش (${qty} ${sale.unit}، ${sale.total.toLocaleString("fa-IR")} تومان، پرداخت‌شده ${Number(sale.paidAmount).toLocaleString("fa-IR")} تومان${due > 0 ? `، مانده ${due.toLocaleString("fa-IR")} تومان` : ""}) برای کشت «${batch.name}»${customer ? ` به مشتری «${customer}»` : ""} ثبت شد.`,
    });

    res.status(201).json({ ...sale.toJSON(), due, warning });
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const sale = await Sale.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ message: "فاکتور فروش یافت نشد." });

    const { date, qty, unitPrice, unit, customer, customerId, paidAmount, paymentTrackingNumber, note } = req.body;
    if (date !== undefined) sale.date = date;
    if (qty !== undefined) sale.qty = qty;
    if (unitPrice !== undefined) sale.unitPrice = unitPrice;
    if (unit !== undefined) sale.unit = unit;
    if (customer !== undefined) sale.customer = customer;
    if (customerId !== undefined) sale.customerId = customerId || null;
    if (paidAmount !== undefined) sale.paidAmount = Number(paidAmount);
    if (paymentTrackingNumber !== undefined) sale.paymentTrackingNumber = paymentTrackingNumber || null;
    if (note !== undefined) sale.note = note;
    sale.total = Number(sale.qty) * Number(sale.unitPrice);
    await sale.save();

    const due = Number(sale.total) - Number(sale.paidAmount);
    await logActivity({
      user: req.user, action: "SALE_UPDATE", entityType: "sale", entityId: sale.id,
      description: `فاکتور فروش (${sale.total.toLocaleString("fa-IR")} تومان، پرداخت‌شده ${Number(sale.paidAmount).toLocaleString("fa-IR")} تومان${due > 0 ? `، مانده ${due.toLocaleString("fa-IR")} تومان` : ""}) ویرایش شد.`,
    });

    res.json({ ...sale.toJSON(), due });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const sale = await Sale.findByPk(req.params.id);
    if (!sale) return res.status(404).json({ message: "فاکتور فروش یافت نشد." });
    await sale.destroy();
    await logActivity({
      user: req.user, action: "SALE_DELETE", entityType: "sale", entityId: sale.id,
      description: `فاکتور فروش (${Number(sale.total).toLocaleString("fa-IR")} تومان) حذف شد.`,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
