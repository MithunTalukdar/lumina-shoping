const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config({ path: path.resolve(__dirname, ".env.local"), override: true });
dotenv.config({ path: path.resolve(__dirname, "..", ".env"), override: false });
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local"), override: false });

if (!process.env.MONGODB_URI && (process.env.GEMINI_API_KEY || "").startsWith("mongodb")) {
  process.env.MONGODB_URI = process.env.GEMINI_API_KEY;
  console.warn("[api] MONGODB_URI missing. Falling back to GEMINI_API_KEY because it looks like a MongoDB URI.");
}

const cors = require("cors");
const express = require("express");

const { connectDB, getDBStatus } = require("./config/db");
const authRoutes = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const productRoutes = require("./routes/products");
const { seedAdminUser } = require("./utils/seedAdmin");

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

const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])];

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
    db: getDBStatus(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/db-status", (_req, res) => {
  return res.json(getDBStatus());
});

app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/products", productRoutes);

app.use((error, _req, res, _next) => {
  if (error.message && error.message.includes("CORS")) {
    return res.status(403).json({ message: error.message });
  }

  console.error("[api] unhandled error:", error);
  return res.status(500).json({ message: "Unexpected server error." });
});

async function startServer() {
  const port = Number(process.env.PORT || 5000);

  await connectDB();

  const adminSeedResult = await seedAdminUser();
  if (adminSeedResult.created) {
    console.log(`[auth] seeded admin user: ${adminSeedResult.email}`);
  }

  app.listen(port, () => {
    console.log(`[api] server running on http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("[api] startup failed:", error.message || error);
  process.exit(1);
});
