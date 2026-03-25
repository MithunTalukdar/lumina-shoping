const mongoose = require("mongoose");

const READY_STATE_LABEL = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  await mongoose.connect(uri, {
    dbName: process.env.MONGODB_DB || undefined,
  });

  const state = READY_STATE_LABEL[mongoose.connection.readyState] || "unknown";
  console.log(`[db] ${state}: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

function getDBStatus() {
  const stateCode = mongoose.connection.readyState;
  return {
    stateCode,
    state: READY_STATE_LABEL[stateCode] || "unknown",
    host: mongoose.connection.host || "",
    name: mongoose.connection.name || "",
  };
}

module.exports = {
  connectDB,
  getDBStatus,
};
