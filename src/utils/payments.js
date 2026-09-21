const PAYMENT_METHODS = ["نقدی", "کارت به کارت", "انتقال بانکی (شبا)", "چک", "سایر"];

/**
 * ورودی خام کاربر برای روش‌های پرداخت را پاک‌سازی و معتبرسازی می‌کند.
 * ورودی: [{ method, amount, trackingNumber, dueDate }, ...]
 * dueDate فقط برای روش «چک» معنی دارد (تاریخ سررسید).
 */
function sanitizePayments(payments) {
  if (!Array.isArray(payments)) return [];
  return payments
    .map((p) => {
      const method = PAYMENT_METHODS.includes(p.method) ? p.method : "سایر";
      return {
        method,
        amount: Number(p.amount) || 0,
        trackingNumber: (p.trackingNumber || "").trim() || null,
        dueDate: method === "چک" && p.dueDate ? p.dueDate : null,
      };
    })
    .filter((p) => p.amount > 0);
}

module.exports = { PAYMENT_METHODS, sanitizePayments };
