const ExcelJS = require("exceljs");
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

/**
 * خروجی اکسل از همه‌ی فاکتورهای فروش یک کشت مشخص، با سربرگی که نام همان کشت را نشان می‌دهد.
 */
exports.exportSalesExcel = async (req, res, next) => {
  try {
    const batch = await Batch.findByPk(req.params.id);
    if (!batch) return res.status(404).json({ message: "کشت یافت نشد." });

    const sales = await Sale.findAll({
      where: { batchId: batch.id },
      order: [["date", "ASC"]],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "پنل مدیریت کارخانه کمپوست";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("فاکتورهای فروش", {
      views: [{ rightToLeft: true }],
    });

    const COLS = 10;

    // --- سربرگ: مشخص می‌کند این گزارش مربوط به کدام کشت است ---
    sheet.mergeCells(1, 1, 1, COLS);
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = `فاکتورهای فروش کشت: ${batch.name}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 26;

    sheet.mergeCells(2, 1, 2, COLS);
    const subCell = sheet.getCell(2, 1);
    const todayFa = new Date().toLocaleDateString("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" });
    subCell.value = `واحد کشت: ${batch.unit}   |   تعداد فاکتور: ${sales.length}   |   تاریخ تهیه گزارش: ${todayFa}`;
    subCell.font = { italic: true, size: 10, color: { argb: "FF6B6350" } };
    subCell.alignment = { horizontal: "center" };

    sheet.addRow([]); // ردیف خالی جداکننده

    // --- سربرگ ستون‌ها ---
    const headerRow = sheet.addRow([
      "شماره فاکتور", "تاریخ", "مشتری", "مقدار", "واحد",
      "قیمت واحد (تومان)", "مبلغ کل (تومان)", "پرداخت‌شده (تومان)", "مانده (تومان)", "شماره پیگیری پرداخت",
    ]);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF2B2822" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFE9D6" } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = { bottom: { style: "thin", color: { argb: "FFD9D2BD" } } };
    });

    let totalQty = 0, totalAmount = 0, totalPaid = 0;

    sales.forEach((s) => {
      const due = Number(s.total) - Number(s.paidAmount);
      totalQty += Number(s.qty);
      totalAmount += Number(s.total);
      totalPaid += Number(s.paidAmount);

      const row = sheet.addRow([
        s.id,
        s.date,
        s.customer || "—",
        Number(s.qty),
        s.unit || batch.unit,
        Number(s.unitPrice),
        Number(s.total),
        Number(s.paidAmount),
        due,
        s.paymentTrackingNumber || "",
      ]);
      row.eachCell((cell) => { cell.alignment = { horizontal: "center" }; });
    });

    if (sales.length === 0) {
      const emptyRow = sheet.addRow(["", "", "هنوز فاکتور فروشی برای این کشت ثبت نشده است.", "", "", "", "", "", "", ""]);
      sheet.mergeCells(emptyRow.number, 1, emptyRow.number, COLS);
      emptyRow.getCell(1).alignment = { horizontal: "center" };
      emptyRow.getCell(1).font = { italic: true, color: { argb: "FF9A917C" } };
    } else {
      const totalRow = sheet.addRow([
        "", "", "جمع کل", totalQty, "", "", totalAmount, totalPaid, totalAmount - totalPaid, "",
      ]);
      totalRow.eachCell((cell) => {
        cell.font = { bold: true };
        cell.alignment = { horizontal: "center" };
        cell.border = { top: { style: "thin", color: { argb: "FFD9D2BD" } } };
      });
    }

    sheet.columns = [
      { width: 14 }, { width: 14 }, { width: 24 }, { width: 12 }, { width: 12 },
      { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 22 },
    ];

    const safeName = `sales-${batch.id}`;
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}.xlsx"; filename*=UTF-8''${encodeURIComponent(`فاکتورهای-فروش-${batch.name}.xlsx`)}`
    );

    await workbook.xlsx.write(res);
    res.end();

    await logActivity({
      user: req.user, action: "BATCH_EXPORT_SALES", entityType: "batch", entityId: batch.id,
      description: `خروجی اکسل فاکتورهای فروش کشت «${batch.name}» تهیه شد (${sales.length} فاکتور).`,
    });
  } catch (err) {
    next(err);
  }
};
