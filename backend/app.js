const cors = require("cors");
const express = require("express");

const { initializeBackend } = require("./bootstrap");
const { getDBStatus } = require("./config/db");
const { loadEnv } = require("./loadEnv");
const assistantRoutes = require("./routes/assistant");
const authRoutes = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const productRoutes = require("./routes/products");

loadEnv();

const app = express();

const defaultOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const configuredOrigins = (process.env.CLIENT_URL || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const vercelOrigin = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "";

const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins, vercelOrigin].filter(Boolean))];

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS."));
    },
  })
);

app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  return res.json({
    ok: true,
    service: "lumina-auth-api",
    db: {
      configured: Boolean(process.env.MONGODB_URI),
      ...getDBStatus(),
    },
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/products", productRoutes);
app.use("/api/assistant", assistantRoutes);

app.use(async (req, _res, next) => {
  const needsDatabase =
    req.path === "/api/db-status" ||
    req.path.startsWith("/api/auth") ||
    req.path.startsWith("/api/cart");

  if (!needsDatabase) {
    return next();
  }

  try {
    await initializeBackend();
    return next();
  } catch (error) {
    return next(error);
  }
});

app.get("/api/db-status", (_req, res) => {
  return res.json({
    configured: Boolean(process.env.MONGODB_URI),
    ...getDBStatus(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);

app.use((error, _req, res, _next) => {
  if (error.message && error.message.includes("CORS")) {
    return res.status(403).json({ message: error.message });
  }

  const statusCode = error.statusCode || 500;
  const message =
    error.message === "MONGODB_URI is not configured."
      ? "Database is not configured. Add MONGODB_URI in your environment variables."
      : error.message || "Unexpected server error.";

  console.error("[api] unhandled error:", error);
  return res.status(statusCode).json({ message });
});

module.exports = app;
