import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth.js";
import { productsRouter } from "./routes/products.js";
import { stockRouter } from "./routes/stock.js";
import { transactionsRouter } from "./routes/transactions.js";
import { usersRouter } from "./routes/users.js";
import { rackRouter } from "./routes/rack.js";
import { scanRouter } from "./routes/scan.js";
import { locationsRouter } from "./routes/locations.js";
import { boxesRouter } from "./routes/boxes.js";
import { suppliersRouter } from "./routes/suppliers.js";
import { purchaseOrdersRouter } from "./routes/purchase-orders.js";
import { categoriesRouter } from "./routes/categories.js";
import { opnameRouter } from "./routes/opname.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;
const isProd = process.env.NODE_ENV === "production";

const parseAllowedOrigins = () => {
  const extras = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return new Set(
    [
      process.env.FRONTEND_URL,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      ...extras,
    ].filter(Boolean),
  );
};

const isPrivateIPv4 = (hostname) => {
  const parts = hostname.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return false;
  }
  if (parts[0] === 10) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  return false;
};

const isDevAllowedOrigin = (origin) => {
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

    const host = parsed.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "::1") return true;
    return isPrivateIPv4(host);
  } catch {
    return false;
  }
};

const allowedOrigins = parseAllowedOrigins();

if (isProd && (!process.env.JWT_SECRET || process.env.JWT_SECRET.toLowerCase().includes("changeme"))) {
  throw new Error("JWT_SECRET is missing or weak. Set a secure random secret before running in production.");
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Please try again later." },
});

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      if (!isProd && isDevAllowedOrigin(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/api/auth/login", authLimiter);

app.get("/", (req, res) => {
  res.send(`
    <html>
      <body style="font-family: system-ui, sans-serif; text-align: center; margin-top: 50px; background: #0f1629; color: white;">
        <h2>Warehouse API Server is Running</h2>
        <p>Aplikasi Frontend Anda berada port 5173.</p>
        <p>Silakan buka: <a href="http://localhost:5173" style="color: #6366f1;">http://localhost:5173</a></p>
      </body>
    </html>
  `);
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Warehouse API is running",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/stock", stockRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/users", usersRouter);
app.use("/api/rack", rackRouter);
app.use("/api/scan", scanRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/boxes", boxesRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/purchase-orders", purchaseOrdersRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/opname", opnameRouter);

app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\nWarehouse API Server running`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://0.0.0.0:${PORT}`);
  console.log(`   Env:     ${process.env.NODE_ENV}\n`);
});

export default app;
