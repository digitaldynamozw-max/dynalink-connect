const fs = require("fs");
const http = require("http");
const path = require("path");

process.env.NODE_ENV = process.env.NODE_ENV || "production";

const host = process.env.HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "3000", 10);
const standaloneServerPath = path.join(__dirname, ".next", "standalone", "server.js");
const buildIdPath = path.join(__dirname, ".next", "BUILD_ID");
const useStandalone = process.env.USE_NEXT_STANDALONE === "true";

async function startNextServer() {
  const next = require("next");
  const app = next({
    dev: false,
    dir: __dirname,
    hostname: host,
    port,
  });
  const handle = app.getRequestHandler();

  await app.prepare();

  http
    .createServer((req, res) => handle(req, res))
    .listen(port, host, () => {
      console.log(`DynaLink Connect listening on http://${host}:${port}`);
    });
}

async function start() {
  try {
    if (useStandalone && fs.existsSync(standaloneServerPath)) {
      console.log(`Starting standalone Next.js server on http://${host}:${port}`);
      require(standaloneServerPath);
      return;
    }

    if (!fs.existsSync(buildIdPath)) {
      throw new Error(
        'No production build was found in ".next". Run "npm run build" before restarting the app.'
      );
    }

    if (useStandalone) {
      console.warn(
        'USE_NEXT_STANDALONE=true was set, but ".next/standalone/server.js" was not found. Falling back to the built Next.js app.'
      );
    } else {
      console.log("Starting built Next.js app with the local node_modules runtime.");
    }

    await startNextServer();
  } catch (error) {
    console.error("Failed to start app:", error);
    process.exit(1);
  }
}

start();
