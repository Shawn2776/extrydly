require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { WebSocketServer, WebSocket } = require("ws");
const http = require("http");
const crypto = require("crypto");
const { jwtVerify } = require("jose");

const { PRINTER_IP, PRINTER_FLUIDD_PORT = 4408, PRINTER_CAMERA_PORT = 8000, PORT = 3001, BRIDGE_SECRET } = process.env;

if (!PRINTER_IP || !BRIDGE_SECRET) {
  console.error("❌  Missing required env vars. Fill in your .env file.");
  process.exit(1);
}

// ─── JWT verify using jose (same library as Next.js side) ─────────────────────
async function verifyStreamToken(token) {
  // Accept raw secret for admin/testing
  if (token === BRIDGE_SECRET) return { admin: true };
  // Verify JWT
  try {
    const secret = new TextEncoder().encode(BRIDGE_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (e) {
    console.log("JWT verify failed:", e.message);
    return null;
  }
}

// ─── In-memory print state ────────────────────────────────────────────────────
let printState = {
  status: "idle",
  progress: 0,
  filename: null,
  layer: 0,
  totalLayers: 0,
  printDuration: 0,
  remainingSecs: 0,
  nozzleTemp: 0,
  nozzleTarget: 0,
  bedTemp: 0,
  bedTarget: 0,
  updatedAt: null,
};

// ─── Auth middleware ──────────────────────────────────────────────────────────
function requireSecret(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "");
  if (token !== BRIDGE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ─── Express app ─────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime(), printer: PRINTER_IP });
});

app.get("/status", requireSecret, (req, res) => {
  res.json(printState);
});

// ─── HTTP + WebSocket server ──────────────────────────────────────────────────
const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/stream" });

wss.on("connection", async (ws, req) => {
  const url = new URL(req.url, `http://localhost`);
  const token = url.searchParams.get("token");

  const payload = await verifyStreamToken(token);

  if (!payload) {
    console.log("🚫  Rejected stream connection — invalid token");
    ws.close(1008, "Unauthorized");
    return;
  }

  console.log("📺  Client connected to camera stream", payload.admin ? "(admin)" : `order ${payload.orderId}`);

  const http_ = require("http");
  const camReq = http_.get(
    { hostname: PRINTER_IP, port: PRINTER_FLUIDD_PORT, path: "/webcam?action=stream", timeout: 0 },
    (camRes) => {
      console.log("📷  Camera status:", camRes.statusCode, "type:", camRes.headers["content-type"]);
      camRes.on("data", (chunk) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(chunk);
        }
      });
      camRes.on("end", () => ws.close());
      camRes.on("error", (err) => {
        console.error("❌  Camera stream error:", err.message);
        ws.close(1011, "Camera error");
      });
    },
  );

  camReq.on("error", (err) => {
    console.error("❌  Camera connection error:", err.message);
    ws.close(1011, "Camera connection failed");
  });

  ws.on("close", () => {
    console.log("📺  Client disconnected");
    camReq.destroy();
  });
});

// ─── Moonraker WebSocket ──────────────────────────────────────────────────────
const MOONRAKER_WS = `ws://${PRINTER_IP}:${PRINTER_FLUIDD_PORT}/websocket`;
let moonrakerWs = null;
let reconnectTimer = null;
let msgId = 1;

function connectMoonraker() {
  console.log(`📡  Connecting to Moonraker at ${MOONRAKER_WS}`);
  moonrakerWs = new WebSocket(MOONRAKER_WS);

  moonrakerWs.on("open", () => {
    console.log("✅  Moonraker connected");
    clearTimeout(reconnectTimer);
    moonrakerWs.send(
      JSON.stringify({
        jsonrpc: "2.0",
        method: "printer.objects.subscribe",
        params: {
          objects: {
            print_stats: null,
            display_status: null,
            extruder: null,
            heater_bed: null,
            virtual_sdcard: null,
          },
        },
        id: msgId++,
      }),
    );
  });

  moonrakerWs.on("message", (data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleMoonrakerMessage(msg);
    } catch {}
  });

  moonrakerWs.on("close", () => {
    console.log("🔄  Moonraker disconnected, reconnecting in 5s...");
    reconnectTimer = setTimeout(connectMoonraker, 5000);
  });

  moonrakerWs.on("error", (err) => {
    console.error("❌  Moonraker WS error:", err.message);
  });
}

function handleMoonrakerMessage(msg) {
  const status = msg?.params?.status || msg?.result?.status;
  if (!status) return;

  const prev = { ...printState };

  if (status.print_stats) {
    const ps = status.print_stats;
    if (ps.state !== undefined) {
      const stateMap = {
        standby: "idle",
        printing: "printing",
        paused: "paused",
        complete: "finished",
        error: "error",
      };
      printState.status = stateMap[ps.state] ?? ps.state;
    }
    if (ps.filename !== undefined) printState.filename = ps.filename || null;
    if (ps.print_duration !== undefined) printState.printDuration = Math.round(ps.print_duration);
    if (ps.info?.current_layer !== undefined) printState.layer = ps.info.current_layer;
    if (ps.info?.total_layer !== undefined) printState.totalLayers = ps.info.total_layer;
  }

  if (status.display_status?.progress !== undefined) {
    printState.progress = Math.round(status.display_status.progress * 100);
  }

  if (status.extruder) {
    if (status.extruder.temperature !== undefined) printState.nozzleTemp = Math.round(status.extruder.temperature);
    if (status.extruder.target !== undefined) printState.nozzleTarget = Math.round(status.extruder.target);
  }

  if (status.heater_bed) {
    if (status.heater_bed.temperature !== undefined) printState.bedTemp = Math.round(status.heater_bed.temperature);
    if (status.heater_bed.target !== undefined) printState.bedTarget = Math.round(status.heater_bed.target);
  }

  if (status.virtual_sdcard?.progress !== undefined && printState.progress === 0) {
    printState.progress = Math.round(status.virtual_sdcard.progress * 100);
  }

  printState.updatedAt = new Date().toISOString();

  if (prev.status !== printState.status || prev.progress !== printState.progress) {
    console.log(
      `🖨️  [${printState.status}] ${printState.progress}% — ${printState.filename || "idle"} — Nozzle: ${printState.nozzleTemp}°C Bed: ${printState.bedTemp}°C`,
    );
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀  Extrudly bridge running on http://localhost:${PORT}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /health   — health check (no auth)`);
  console.log(`  GET  /status   — print state  (Bearer token)`);
  console.log(`  WS   /stream   — camera feed  (?token=jwt or ?token=secret)\n`);
});

connectMoonraker();
