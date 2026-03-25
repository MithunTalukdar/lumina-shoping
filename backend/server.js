const app = require("./app");
const { loadEnv } = require("./loadEnv");

loadEnv();

const port = Number(process.env.PORT || 5000);

const server = app.listen(port, () => {
  console.log(`[api] server running on http://localhost:${port}`);
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(`[api] port ${port} is already in use. Stop the existing server or set a different PORT.`);
    process.exit(1);
  }

  throw error;
});
