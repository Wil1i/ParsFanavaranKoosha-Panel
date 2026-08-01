const router = require("express").Router();
const ctrl = require("../controllers/integration.controller");
const { authenticate, requireAdmin } = require("../middleware/auth.middleware");

router.use(authenticate, requireAdmin);

router.get("/woocommerce", ctrl.getSettings);
router.put("/woocommerce", ctrl.updateSettings);
router.post("/woocommerce/test", ctrl.testConnection);
router.post("/woocommerce/sync", ctrl.syncOrders);

module.exports = router;
