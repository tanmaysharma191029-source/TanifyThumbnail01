// server.js — static frontend + save orders (JSON) + optional QR fallback
const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const QRCode = require("qrcode");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "set-a-strong-token";

const PUBLIC_DIR  = path.join(__dirname, "public");
const DATA_DIR    = path.join(__dirname, "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, "[]", "utf8");

app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

const readJSON  = p => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJSON = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2));

// Health
app.get("/api/health", (_, res) => res.json({ ok: true }));

// Save order
app.post("/api/order", (req, res) => {
  try{
    const b = req.body || {};
    if(!b.tierName || !b.priceUSD) return res.status(400).json({ ok:false, error:"invalid_payload" });
    const order = { id: cryptoId(), createdAt: new Date().toISOString(), ...b, status:"new" };
    const list = readJSON(ORDERS_FILE); list.unshift(order); writeJSON(ORDERS_FILE, list);
    res.json({ ok:true, id:order.id });
  }catch(e){ console.error(e); res.status(500).json({ ok:false, error:"save_failed" }); }
});

// (Optional) list orders
app.get("/api/orders", (req, res) => {
  const q = req.query.token;
  const h = (req.headers.authorization||"").replace("Bearer ","");
  if(q!==ADMIN_TOKEN && h!==ADMIN_TOKEN) return res.status(401).json({ ok:false, error:"unauthorized" });
  try{ res.json(readJSON(ORDERS_FILE)); }catch(e){ res.status(500).json({ ok:false }); }
});

// Fallback QR (if you *don’t* provide image). Not used by default.
app.get("/api/qr", async (req, res) => {
  try{
    const text = String(req.query.text || "");
    if(!text) return res.status(400).send("missing text");
    res.setHeader("Content-Type","image/png");
    const buf = await QRCode.toBuffer(text, { errorCorrectionLevel:"M", margin:1, width:300 });
    res.end(buf);
  }catch(e){ console.error(e); res.status(500).send("qr_failed"); }
});

// SPA fallback
app.get("*", (_, res) => res.sendFile(path.join(PUBLIC_DIR, "index.html")));

function cryptoId(){ try{ return require("crypto").randomUUID(); } catch{ return String(Date.now()); } }

app.listen(PORT, ()=> console.log(`✅ http://localhost:${PORT}`));
