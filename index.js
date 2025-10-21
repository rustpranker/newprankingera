import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();

// --- Настройки CORS ---
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://www.pranking.xyz";
app.use(
  cors({
    origin: [FRONTEND_ORIGIN],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-secret"],
  })
);
app.use(express.json());

// --- Telegram настройки ---
const BOT_TOKEN = process.env.BOT_TOKEN || "8277453489:AAEjGhpEwotl5IagqSH9FGq9gQpbiyRbxeU";
const CHAT_ID = process.env.CHAT_ID || "7991972980";
const PORT = process.env.PORT || 8080;

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn("⚠️ WARNING: BOT_TOKEN or CHAT_ID not set in env.");
}

// --- Хранилище заказов (в памяти) ---
const orders = new Map(); // id -> { email, telegram, items, total, method, status }

// --- Генерация ID ---
const genId = () => Math.random().toString(36).slice(2, 10);

// --- Проверка работы ---
app.get("/", (req, res) => res.json({ ok: true, msg: "Backend running" }));

// --- Создание заказа ---
app.post("/order", async (req, res) => {
  try {
    const { email, telegram, items, total, method } = req.body || {};
    if (!email || !telegram || !items || typeof total === "undefined") {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    const id = genId();
    orders.set(id, { id, email, telegram, items, total, method, status: "pending" });

    const text =
      `🛒 *Новый заказ!*\n\n` +
      `ID: ${id}\n` +
      `👤 Telegram: ${telegram}\n` +
      `✉️ Email: ${email}\n` +
      `💳 Метод: ${method || "—"}\n` +
      `📦 Позиции:\n${items.map((it) => `• ${it}`).join("\n")}\n\n` +
      `💰 Итого: ${total}\n` +
      `⏰ ${new Date().toLocaleString()}`;

    const keyboard = {
      inline_keyboard: [[{ text: "✅ Выполнено!", callback_data: `done_${id}` }]],
    };

    // Отправляем заказ в Telegram
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }),
    });

    res.json({ ok: true, orderId: id, status: "pending" });
  } catch (err) {
    console.error("❌ /order error:", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// --- Подтверждение заказа (автоматически с фронта) ---
app.post("/confirm", (req, res) => {
  const { id } = req.body;
  const order = orders.get(id);

  if (!order) {
    return res.status(404).json({ ok: false, error: "Order not found" });
  }

  order.status = "success";
  console.log(`✅ Order ${id} marked as success (auto)`);

  res.json({ ok: true, status: "success" });
});

// --- Telegram callback (кнопка “Выполнено”) ---
app.post(`/telegram/${BOT_TOKEN}`, async (req, res) => {
  try {
    const { callback_query } = req.body;
    if (!callback_query) return res.sendStatus(200);

    const { data, message } = callback_query;
    if (data && data.startsWith("done_")) {
      const orderId = data.split("_")[1];
      const order = orders.get(orderId);

      if (order) {
        order.status = "success";

        // Сообщение админу
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: `✅ Заказ *${orderId}* выполнен.`,
            parse_mode: "Markdown",
          }),
        });

        // Убираем кнопку
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: message.chat.id,
            message_id: message.message_id,
            reply_markup: { inline_keyboard: [] },
          }),
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Telegram callback error:", err);
    res.sendStatus(500);
  }
});

// --- Получение заказов пользователя ---
app.get("/orders/:telegram", (req, res) => {
  const tg = req.params.telegram;
  const userOrders = Array.from(orders.values()).filter((o) => o.telegram === tg);
  res.json({ ok: true, orders: userOrders });
});

// --- Запуск ---
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
