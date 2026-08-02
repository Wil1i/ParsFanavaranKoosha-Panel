const { Sale, Batch, Customer } = require("../models");
const { logActivity } = require("../utils/activityLogger");

/**
 * از customerId موجود استفاده می‌کند، یا در صورت ارسال newCustomer (نام + تلفن + آدرس)
 * یک مشتری جدید در جدول customers می‌سازد و به فاکتور متصل می‌کند.
 */
async function resolveCustomer(req, { customerId, customer, newCustomer }) {
  if (customerId) {
    const existing = await Customer.findByPk(customerId);
    if (existing) return { customerId: existing.id, customerName: existing.fullName };
  }

  if (newCustomer && newCustomer.fullName && newCustomer.fullName.trim()) {
    const created = await Customer.create({
      fullName: newCustomer.fullName.trim(),
      phone: (newCustomer.phone || "").trim() || null,
      address: (newCustomer.address || "").trim() || null,
    });
    await logActivity({
      user: req.user, action: "CUSTOMER_CREATE", entityType: "customer", entityId: created.id,
      description: `مشتری «${created.fullName}» از طریق فاکتور فروش ایجاد شد.`,
    });
    return { customerId: created.id, customerName: created.fullName };
  }

  return { customerId: null, customerName: customer || null };
}

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
    const { batchId, date, qty, unitPrice, unit, customer, customerId, newCustomer, paidAmount, paymentTrackingNumber, note } = req.body;
    if (!batchId || !date || !qty || !unitPrice) {
      return res.status(400).json({ message: "کشت، تاریخ، مقدار و قیمت واحد الزامی است." });
    }

    const batch = await Batch.findByPk(batchId);
    if (!batch) return res.status(404).json({ message: "کشت یافت نشد." });

    const resolved = await resolveCustomer(req, { customerId, customer, newCustomer });

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
      customer: resolved.customerName,
      customerId: resolved.customerId,
      note: note || null,
    });

    const due = total - Number(sale.paidAmount);
    await logActivity({
      user: req.user, action: "SALE_CREATE", entityType: "sale", entityId: sale.id,
      description: `فاکتور فروش شماره ${sale.id} (${qty} ${sale.unit}، ${sale.total.toLocaleString("fa-IR")} تومان، پرداخت‌شده ${Number(sale.paidAmount).toLocaleString("fa-IR")} تومان${due > 0 ? `، مانده ${due.toLocaleString("fa-IR")} تومان` : ""}) برای کشت «${batch.name}»${resolved.customerName ? ` به مشتری «${resolved.customerName}»` : ""} ثبت شد.`,
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

    const { date, qty, unitPrice, unit, customer, customerId, newCustomer, paidAmount, paymentTrackingNumber, note } = req.body;
    if (date !== undefined) sale.date = date;
    if (qty !== undefined) sale.qty = qty;
    if (unitPrice !== undefined) sale.unitPrice = unitPrice;
    if (unit !== undefined) sale.unit = unit;
    if (customerId !== undefined || newCustomer !== undefined || customer !== undefined) {
      const resolved = await resolveCustomer(req, { customerId, customer, newCustomer });
      sale.customer = resolved.customerName;
      sale.customerId = resolved.customerId;
    }
    if (paidAmount !== undefined) sale.paidAmount = Number(paidAmount);
    if (paymentTrackingNumber !== undefined) sale.paymentTrackingNumber = paymentTrackingNumber || null;
    if (note !== undefined) sale.note = note;
    sale.total = Number(sale.qty) * Number(sale.unitPrice);
    await sale.save();

    const due = Number(sale.total) - Number(sale.paidAmount);
    await logActivity({
      user: req.user, action: "SALE_UPDATE", entityType: "sale", entityId: sale.id,
      description: `فاکتور فروش شماره ${sale.id} (${sale.total.toLocaleString("fa-IR")} تومان، پرداخت‌شده ${Number(sale.paidAmount).toLocaleString("fa-IR")} تومان${due > 0 ? `، مانده ${due.toLocaleString("fa-IR")} تومان` : ""}) ویرایش شد.`,
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
      description: `فاکتور فروش شماره ${sale.id} (${Number(sale.total).toLocaleString("fa-IR")} تومان) حذف شد.`,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
