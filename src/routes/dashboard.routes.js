const router = require("express").Router();
const ctrl = require("../controllers/dashboard.controller");
const { authenticate } = require("../middleware/auth.middleware");

// هر کاربر واردشده می‌تواند داشبورد را ببیند؛ محتوای آن بر اساس دسترسی‌های
// خودِ کاربر (کشت‌ها/انبار/ادمین) در کنترلر فیلتر می‌شود.
router.get("/", authenticate, ctrl.summary);

module.exports = router;
