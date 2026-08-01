const { ActivityLog } = require("../models");

/**
 * ثبت یک رخداد در لاگ فعالیت‌ها. خطای ثبت لاگ هرگز نباید عملیات اصلی را متوقف کند،
 * پس همیشه با try/catch محافظت شده و فقط در کنسول هشدار می‌دهد.
 * @param {{ user: object|null, action: string, entityType: string, entityId?: string|null, description: string, meta?: object }} params
 */
async function logActivity({ user, action, entityType, entityId = null, description, meta = null }) {
  try {
    await ActivityLog.create({
      userId: user ? user.id : null,
      username: user ? user.username : null,
      fullName: user ? user.fullName : null,
      action,
      entityType,
      entityId,
      description,
      meta: meta ? JSON.stringify(meta) : null,
    });
  } catch (err) {
    console.error("ثبت لاگ فعالیت با خطا مواجه شد:", err.message);
  }
}

module.exports = { logActivity };
