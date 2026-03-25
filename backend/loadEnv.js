const dotenv = require("dotenv");
const path = require("path");

let isLoaded = false;

function loadEnv() {
  if (isLoaded) {
    return;
  }

  isLoaded = true;

  dotenv.config({ path: path.resolve(__dirname, ".env") });
  dotenv.config({ path: path.resolve(__dirname, ".env.local"), override: true });
  dotenv.config({ path: path.resolve(__dirname, "..", ".env"), override: false });
  dotenv.config({ path: path.resolve(__dirname, "..", ".env.local"), override: false });

  if (!process.env.MONGODB_URI && (process.env.GEMINI_API_KEY || "").startsWith("mongodb")) {
    process.env.MONGODB_URI = process.env.GEMINI_API_KEY;
    console.warn("[api] MONGODB_URI missing. Falling back to GEMINI_API_KEY because it looks like a MongoDB URI.");
  }
}

module.exports = {
  loadEnv,
};
