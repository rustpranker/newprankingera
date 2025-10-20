// index.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// config CORS - вставь сюда свой фронтенд-домен
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://pranking.xyz";

app.use(cors({
  origin: [FRONTEND_ORIGIN, /* можно добавить другие домены */],
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type","x-secret"]
}));

app.use(express.json());

// env vars
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const CHAT_ID = process.env.CHAT_ID || ""; // numeric chat id or channel id
const PORT = process.env.PORT || 8080;

if(!BOT_TOKEN || !CHAT_ID){
  console.warn("WARNING: BOT_TOKEN or CHAT_ID not set in env. Telegram will not receive messages.");
}

// root
app.get("/", (req,res) => res.json({ ok:true, msg: "Backend running" }));

app.post("/order", async (req,res) => {
  try{
    console.log("POST /order body:", JSON.stringify(req.body).slice(0,1000));
    const { email, telegram, items, total, method } = req.body || {};

    if(!email || !telegram || !items || typeof total === "undefined"){
      return res.status(400).json({ ok:false, error: "Missing fields: email, telegram, items or total" });
    }

    // build message (escape HTML chars)
    const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
    const itemsText = Array.isArray(items) ? items.map(it => `• ${escapeHtml(it)}`).join("\n") : escapeHtml(String(items));

    const text = `🛒 *Новый заказ!*\n\n` +
                 `👤 Telegram: ${escapeHtml(telegram)}\n` +
                 `✉️ Email: ${escapeHtml(email)}\n` +
                 `💳 Метод: ${escapeHtml(method || '—')}\n` +
                 `📦 Позиции:\n${itemsText}\n\n` +
                 `💰 Итого: ${escapeHtml(String(total))}\n` +
                 `⏰ ${new Date().toLocaleString()}`;

    if(!BOT_TOKEN || !CHAT_ID){
      console.warn("Telegram not configured, returning success locally");
      return res.json({ ok:true, msg:"telegram-not-configured", preview:text });
    }

    const tgResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: "Markdown" })
    });

    const tgJson = await tgResp.json();
    if(!tgJson.ok){
      console.error("Telegram API error:", tgJson);
      return res.status(500).json({ ok:false, error: "telegram_error", details: tgJson });
    }

    return res.json({ ok:true });
  }catch(err){
    console.error("Error in /order:", err);
    return res.status(500).json({ ok:false, error: "server_error", details: String(err) });
  }
});

app.listen(PORT, ()=>console.log(`Server listening on port ${PORT}`));
