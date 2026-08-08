const router = require("express").Router();
const ctrl = require("../controllers/batch.controller");
const { authenticate, requireAccess } = require("../middleware/auth.middleware");

router.use(authenticate, requireAccess("batches"));

router.get("/", ctrl.list);
router.get("/:id/export-sales", ctrl.exportSalesExcel);
router.get("/:id", ctrl.getOne);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
