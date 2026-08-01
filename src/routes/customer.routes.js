const router = require("express").Router();
const ctrl = require("../controllers/customer.controller");
const { authenticate, requireAccess } = require("../middleware/auth.middleware");

router.use(authenticate, requireAccess("batches"));

router.get("/", ctrl.list); // ?q=جستجو
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
