const router = require("express").Router();
const ctrl = require("../controllers/activityLog.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");

router.use(authenticate, requireAdmin);

router.get("/", ctrl.list);
// ?page=1&limit=50&userId=...&action=...&entityType=...&from=YYYY-MM-DD&to=YYYY-MM-DD&q=متن جستجو

module.exports = router;
