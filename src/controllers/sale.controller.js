const { Sale, Batch, Customer, Payment, sequelize } = require("../models");
const { logActivity } = require("../utils/activityLogger");
const smsUtil = require("../utils/sms")
require("dotenv").config();

const PAYMENT_METHODS = ["نقدی", "کارت به کارت", "انتقال بانکی (شبا)", "چک", "سایر"];

/**
 * از customerId موجود استفاده می‌کند، یا در صورت ارسال newCustomer (نام + تلفن + کد ملی + آدرس)
 * یک مشتری جدید در جدول customers می‌سازد و به فاکتور متصل می‌کند.
 */
async function resolveCustomer(req, { customerId, customer, newCustomer }) {
  if (customerId) {
    const existing = await Customer.findByPk(customerId);
    if (existing) return { customerId: existing.id, customerName: existing.fullName, phone : "09103438399" };
  }

  if (newCustomer && newCustomer.fullName && newCustomer.fullName.trim()) {
    const created = await Customer.create({
      fullName: newCustomer.fullName.trim(),
      phone: (newCustomer.phone || "").trim() || null,
      nationalId: (newCustomer.nationalId || "").trim() || null,
      address: (newCustomer.address || "").trim() || null,
    });
    await logActivity({
      user: req.user, action: "CUSTOMER_CREATE", entityType: "customer", entityId: created.id,
      description: `مشتری «${created.fullName}» از طریق فاکتور فروش ایجاد شد.`,
    });
    return { customerId: created.id, customerName: created.fullName, phone : "09103438399" };
  }

  return { customerId: null, customerName: customer || null, phone : null };
}

/**
 * لیست ورودی روش‌های پرداخت را پاک‌سازی و معتبرسازی می‌کند.
 * ورودی: [{ method, amount, trackingNumber }, ...]
 */
function sanitizePayments(payments) {
  if (!Array.isArray(payments)) return [];
  return payments
    .map((p) => ({
      method: (p.method || "").trim() || "سایر",
      amount: Number(p.amount) || 0,
      trackingNumber: (p.trackingNumber || "").trim() || null,
    }))
    .filter((p) => p.amount > 0);
}

exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.batchId) where.batchId = req.query.batchId;
    const sales = await Sale.findAll({
      where, order: [["date", "DESC"]],
      include: [{ model: Payment, as: "payments" }],
    });
    res.json(sales);
  } catch (err) {
    next(err);
  }
};
function fmtDate(iso){
  if(!iso) return "—";
  try{ return new Date(iso).toLocaleDateString("fa-IR", { year:"numeric", month:"2-digit", day:"2-digit" }); }
  catch(e){ return iso; }
}
exports.create = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { batchId, date, qty, unitPrice, unit, blockCount, customer, customerId, newCustomer, payments, note, sms } = req.body;
    if (!batchId || !date || !qty || !unitPrice) {
      await t.rollback();
      return res.status(400).json({ message: "کشت، تاریخ، مقدار و قیمت واحد الزامی است." });
    }

    const batch = await Batch.findByPk(batchId, { transaction: t });
    if (!batch) {
      await t.rollback();
      return res.status(404).json({ message: "کشت یافت نشد." });
    }

    const resolved = await resolveCustomer(req, { customerId, customer, newCustomer });

    // soft check: warn (but don't block) if selling more than what's currently sellable
    const soldQty = (await Sale.sum("qty", { where: { batchId }, transaction: t })) || 0;
    const remaining = Number(batch.productionQty) - soldQty;
    const warning = Number(qty) > remaining
      ? `مقدار فروش از باقیمانده قابل فروش (${remaining}) بیشتر است.`
      : undefined;

    const total = Number(qty) * Number(unitPrice);
    const cleanPayments = sanitizePayments(payments);
    const paidAmount = cleanPayments.reduce((s, p) => s + p.amount, 0);

    const sale = await Sale.create({
      batchId, date, qty, unitPrice,
      unit: unit || batch.unit,
      blockCount: (blockCount !== undefined && blockCount !== "" && blockCount !== null) ? Number(blockCount) : null,
      total,
      paidAmount,
      customer: resolved.customerName,
      customerId: resolved.customerId,
      note: note || null,
    }, { transaction: t });

    if (cleanPayments.length > 0) {
      await Payment.bulkCreate(
        cleanPayments.map((p) => ({ ...p, saleId: sale.id })),
        { transaction: t }
      );
    }

    await t.commit();

    const due = total - paidAmount;
    const methodsSummary = cleanPayments.map((p) => `${p.method}: ${p.amount.toLocaleString("fa-IR")} تومان`).join("، ");
    await logActivity({
      user: req.user, action: "SALE_CREATE", entityType: "sale", entityId: sale.id,
      description: `فاکتور فروش شماره ${sale.id} (${qty} ${sale.unit}، ${total.toLocaleString("fa-IR")} تومان${methodsSummary ? `، پرداخت: ${methodsSummary}` : ""}${due > 0 ? `، مانده ${due.toLocaleString("fa-IR")} تومان` : ""}) برای کشت «${batch.name}»${resolved.customerName ? ` به مشتری «${resolved.customerName}»` : ""} ثبت شد.`,
    });
    
    if(sms && sms == true){
      smsUtil.send(process.env.FAKTOR_SMS_CODE, resolved.phone + "", [fmtDate(sale.date), sale.qty + " " + sale.unit + "", sale.total + " تومان", sale.paid_amount||0 + ' تومان', sale.paid_amount >= 1 ? (sale.total - sale.paid_amount) : 0 + ' تومان'])
    }

    const full = await Sale.findByPk(sale.id, { include: [{ model: Payment, as: "payments" }] });
    if(full && Object.keys(full).length >= 1){
      res.status(201).json({ ...full.toJSON() || {}, due, warning });
    }else{
      res.status(201).json({ ... due, warning });
    }
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.update = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const sale = await Sale.findByPk(req.params.id, { transaction: t });
    if (!sale) {
      await t.rollback();
      return res.status(404).json({ message: "فاکتور فروش یافت نشد." });
    }

    const { date, qty, unitPrice, unit, blockCount, customer, customerId, newCustomer, payments, note } = req.body;
    if (date !== undefined) sale.date = date;
    if (qty !== undefined) sale.qty = qty;
    if (unitPrice !== undefined) sale.unitPrice = unitPrice;
    if (unit !== undefined) sale.unit = unit;
    if (blockCount !== undefined) sale.blockCount = (blockCount === "" || blockCount === null) ? null : Number(blockCount);
    if (customerId !== undefined || newCustomer !== undefined || customer !== undefined) {
      const resolved = await resolveCustomer(req, { customerId, customer, newCustomer });
      sale.customer = resolved.customerName;
      sale.customerId = resolved.customerId;
    }
    if (note !== undefined) sale.note = note;
    sale.total = Number(sale.qty) * Number(sale.unitPrice);

    let cleanPayments = null;
    if (payments !== undefined) {
      cleanPayments = sanitizePayments(payments);
      await Payment.destroy({ where: { saleId: sale.id }, transaction: t });
      if (cleanPayments.length > 0) {
        await Payment.bulkCreate(
          cleanPayments.map((p) => ({ ...p, saleId: sale.id })),
          { transaction: t }
        );
      }
      sale.paidAmount = cleanPayments.reduce((s, p) => s + p.amount, 0);
    }

    await sale.save({ transaction: t });
    await t.commit();

    const due = Number(sale.total) - Number(sale.paidAmount);
    await logActivity({
      user: req.user, action: "SALE_UPDATE", entityType: "sale", entityId: sale.id,
      description: `فاکتور فروش شماره ${sale.id} (${sale.total.toLocaleString("fa-IR")} تومان، پرداخت‌شده ${Number(sale.paidAmount).toLocaleString("fa-IR")} تومان${due > 0 ? `، مانده ${due.toLocaleString("fa-IR")} تومان` : ""}) ویرایش شد.`,
    });

    const full = await Sale.findByPk(sale.id, { include: [{ model: Payment, as: "payments" }] });
    res.json({ ...full.toJSON(), due });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const sale = await Sale.findByPk(req.params.id, { transaction: t });
    if (!sale) {
      await t.rollback();
      return res.status(404).json({ message: "فاکتور فروش یافت نشد." });
    }
    await Payment.destroy({ where: { saleId: sale.id }, transaction: t });
    await sale.destroy({ transaction: t });
    await t.commit();
    await logActivity({
      user: req.user, action: "SALE_DELETE", entityType: "sale", entityId: sale.id,
      description: `فاکتور فروش شماره ${sale.id} (${Number(sale.total).toLocaleString("fa-IR")} تومان) حذف شد.`,
    });
    res.status(204).send();
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
