const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const batchRoutes = require("./routes/batch.routes");
const purchaseRoutes = require("./routes/purchase.routes");
const saleRoutes = require("./routes/sale.routes");
const itemRoutes = require("./routes/item.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const activityLogRoutes = require("./routes/activityLog.routes");
const integrationRoutes = require("./routes/integration.routes");
const webOrderRoutes = require("./routes/weborder.routes");
const customerRoutes = require("./routes/customer.routes");
const { notFound, errorHandler } = require("./middleware/error.middleware");

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/batches", batchRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/logs", activityLogRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/web-orders", webOrderRoutes);
app.use("/api/customers", customerRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
