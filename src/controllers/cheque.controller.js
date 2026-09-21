const { Payment, Sale, Purchase, Batch } = require("../models");

/**
 * همه‌ی پرداخت‌هایی که روش‌شان «چک» است را از هر دو طرف (فاکتور فروش = دریافتی،
 * فاکتور خرید = پرداختی) می‌آورد و در یک قالب یکسان برمی‌گرداند.
 */
exports.list = async (req, res, next) => {
  try {
    const where = { method: "چک" };
    const status = req.query.status; // "upcoming" | "overdue" | undefined

    const payments = await Payment.findAll({
      where,
      order: [["dueDate", "ASC"]],
      include: [
        {
          model: Sale, as: "sale",
          include: [{ model: Batch, as: "batch", attributes: ["id", "name"] }],
        },
        {
          model: Purchase, as: "purchase",
          include: [{ model: Batch, as: "batch", attributes: ["id", "name"] }],
        },
      ],
    });

    const today = new Date().toISOString().slice(0, 10);

    let cheques = payments
      .filter((p) => p.saleId || p.purchaseId) // حذف رکوردهای یتیم احتمالی
      .map((p) => {
        const direction = p.saleId ? "received" : "paid";
        const source = p.saleId ? p.sale : p.purchase;
        const batch = source && source.batch ? source.batch : null;
        const isOverdue = p.dueDate && p.dueDate < today;

        return {
          id: p.id,
          direction, // received = دریافتی (از مشتری) | paid = پرداختی (به تامین‌کننده)
          amount: p.amount,
          sayadNumber: p.trackingNumber,
          dueDate: p.dueDate,
          isOverdue,
          invoiceId: p.saleId || p.purchaseId,
          invoiceType: p.saleId ? "sale" : "purchase",
          batchId: batch ? batch.id : null,
          batchName: batch ? batch.name : null,
          counterparty: direction === "received"
            ? (source ? source.customer : null)
            : (source ? source.supplier : null),
        };
      });

    if (status === "overdue") cheques = cheques.filter((c) => c.isOverdue);
    if (status === "upcoming") cheques = cheques.filter((c) => !c.isOverdue);
    if (req.query.direction) cheques = cheques.filter((c) => c.direction === req.query.direction);

    const totalReceived = cheques.filter((c) => c.direction === "received").reduce((s, c) => s + Number(c.amount), 0);
    const totalPaid = cheques.filter((c) => c.direction === "paid").reduce((s, c) => s + Number(c.amount), 0);
    const overdueCount = cheques.filter((c) => c.isOverdue).length;

    res.json({ cheques, totalReceived, totalPaid, overdueCount, total: cheques.length });
  } catch (err) {
    next(err);
  }
};
