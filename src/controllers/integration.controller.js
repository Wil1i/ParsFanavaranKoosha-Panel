const axios = require("axios");
const { IntegrationSetting, WebOrder } = require("../models");
const { logActivity } = require("../utils/activityLogger");

async function getOrCreateSettings() {
  let row = await IntegrationSetting.findOne({ where: { provider: "woocommerce" } });
  if (!row) {
    row = await IntegrationSetting.create({ provider: "woocommerce" });
  }
  return row;
}

function maskSecret(value) {
  if (!value) return null;
  if (value.length <= 4) return "****";
  return "•".repeat(Math.max(0, value.length - 4)) + value.slice(-4);
}

function serializeSettings(row) {
  return {
    provider: row.provider,
    siteUrl: row.siteUrl || "",
    consumerKeyMasked: maskSecret(row.consumerKey),
    consumerSecretMasked: maskSecret(row.consumerSecret),
    configured: !!(row.siteUrl && row.consumerKey && row.consumerSecret),
    isConnected: row.isConnected,
    lastSyncAt: row.lastSyncAt,
    lastSyncStatus: row.lastSyncStatus,
    lastSyncMessage: row.lastSyncMessage,
    lastSyncCount: row.lastSyncCount,
  };
}

function wooClient(row) {
  const baseURL = String(row.siteUrl || "").replace(/\/+$/, "") + "/wp-json/wc/v3";
  return axios.create({
    baseURL,
    timeout: 15000,
    auth: { username: row.consumerKey, password: row.consumerSecret },
  });
}

exports.getSettings = async (req, res, next) => {
  try {
    const row = await getOrCreateSettings();
    res.json(serializeSettings(row));
  } catch (err) {
    next(err);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const row = await getOrCreateSettings();
    const { siteUrl, consumerKey, consumerSecret } = req.body;

    if (siteUrl !== undefined) row.siteUrl = siteUrl.trim();
    if (consumerKey) row.consumerKey = consumerKey.trim(); // خالی یعنی بدون تغییر
    if (consumerSecret) row.consumerSecret = consumerSecret.trim();
    // تغییر تنظیمات یعنی باید دوباره اتصال تست شود
    row.isConnected = false;
    await row.save();

    await logActivity({
      user: req.user, action: "INTEGRATION_SETTINGS_UPDATE", entityType: "integration", entityId: row.id,
      description: `تنظیمات اتصال فروشگاه وردپرس/ووکامرس به‌روزرسانی شد.`,
    });

    res.json(serializeSettings(row));
  } catch (err) {
    next(err);
  }
};

exports.testConnection = async (req, res, next) => {
  try {
    const row = await getOrCreateSettings();
    if (!row.siteUrl || !row.consumerKey || !row.consumerSecret) {
      return res.status(400).json({ message: "ابتدا آدرس سایت، Consumer Key و Consumer Secret را ذخیره کنید." });
    }

    try {
      const client = wooClient(row);
      const resp = await client.get("/orders", { params: { per_page: 1 } });
      const total = resp.headers["x-wp-total"] || "0";

      row.isConnected = true;
      await row.save();

      await logActivity({
        user: req.user, action: "INTEGRATION_TEST", entityType: "integration", entityId: row.id,
        description: `اتصال به فروشگاه وردپرس با موفقیت تست شد (تعداد سفارش‌ها: ${total}).`,
      });

      res.json({ ok: true, message: `اتصال موفق بود. تعداد کل سفارش‌های فروشگاه: ${total}`, totalOrders: Number(total) });
    } catch (apiErr) {
      row.isConnected = false;
      await row.save();
      const detail = apiErr.response
        ? `کد ${apiErr.response.status}: ${(apiErr.response.data && apiErr.response.data.message) || apiErr.message}`
        : apiErr.message;

      await logActivity({
        user: req.user, action: "INTEGRATION_TEST", entityType: "integration", entityId: row.id,
        description: `تست اتصال به فروشگاه وردپرس ناموفق بود (${detail}).`,
      });

      return res.status(400).json({ ok: false, message: `اتصال ناموفق بود: ${detail}` });
    }
  } catch (err) {
    next(err);
  }
};

exports.syncOrders = async (req, res, next) => {
  try {
    const row = await getOrCreateSettings();
    if (!row.siteUrl || !row.consumerKey || !row.consumerSecret) {
      return res.status(400).json({ message: "ابتدا اتصال فروشگاه را تنظیم و تست کنید." });
    }

    const client = wooClient(row);
    const perPage = 50;
    let page = 1;
    let fetched = 0;
    let upserted = 0;

    // حداکثر ۵ صفحه (۲۵۰ سفارش) در هر بار همگام‌سازی، برای جلوگیری از درخواست‌های خیلی طولانی
    for (; page <= 5; page += 1) {
      const resp = await client.get("/orders", {
        params: { per_page: perPage, page, orderby: "date", order: "desc" },
      });
      const orders = resp.data || [];
      if (orders.length === 0) break;
      fetched += orders.length;

      for (const o of orders) {
        const itemsSummary = (o.line_items || [])
          .map((li) => `${li.name} × ${li.quantity}`)
          .join("، ");

        const [record, created] = await WebOrder.findOrCreate({
          where: { provider: "woocommerce", externalOrderId: String(o.id) },
          defaults: {
            provider: "woocommerce",
            externalOrderId: String(o.id),
            orderNumber: o.number ? String(o.number) : String(o.id),
            customerName: [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(" ") || null,
            customerEmail: o.billing?.email || null,
            total: Number(o.total || 0),
            currency: o.currency || null,
            status: o.status || null,
            orderDate: o.date_created ? new Date(o.date_created) : null,
            itemsSummary,
            rawPayload: JSON.stringify(o),
          },
        });

        if (!created) {
          // به‌روزرسانی وضعیت/مبلغ سفارش‌های قبلاً همگام‌شده (مثلاً تغییر وضعیت به "تکمیل‌شده")
          record.status = o.status || record.status;
          record.total = Number(o.total || 0);
          record.itemsSummary = itemsSummary;
          record.rawPayload = JSON.stringify(o);
          await record.save();
        }
        upserted += 1;
      }

      if (orders.length < perPage) break; // آخرین صفحه بود
    }

    row.lastSyncAt = new Date();
    row.lastSyncStatus = "success";
    row.lastSyncMessage = `${upserted} سفارش همگام‌سازی شد.`;
    row.lastSyncCount = upserted;
    row.isConnected = true;
    await row.save();

    await logActivity({
      user: req.user, action: "INTEGRATION_SYNC", entityType: "integration", entityId: row.id,
      description: `همگام‌سازی سفارش‌های فروشگاه وردپرس انجام شد (${upserted} سفارش).`,
    });

    res.json({ ok: true, fetched, upserted, lastSyncAt: row.lastSyncAt });
  } catch (err) {
    try {
      const row = await getOrCreateSettings();
      const detail = err.response
        ? `کد ${err.response.status}: ${(err.response.data && err.response.data.message) || err.message}`
        : err.message;
      row.lastSyncStatus = "error";
      row.lastSyncMessage = detail;
      await row.save();
      await logActivity({
        user: req.user, action: "INTEGRATION_SYNC", entityType: "integration", entityId: row.id,
        description: `همگام‌سازی سفارش‌های فروشگاه وردپرس با خطا مواجه شد (${detail}).`,
      });
    } catch (e) { /* ignore secondary failure */ }
    next(err);
  }
};
