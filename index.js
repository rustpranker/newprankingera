import express from "express";
import cors from "cors";

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

// --- Настройки Telegram ---
const BOT_TOKEN = process.env.BOT_TOKEN || "8277453489:AAEjGhpEwotl5IagqSH9FGq9gQpbiyRbxeU";
const CHAT_ID = process.env.CHAT_ID || "7991972980";
const PORT = process.env.PORT || 8080;

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn("⚠️ WARNING: BOT_TOKEN or CHAT_ID not set in env. Telegram will not receive messages.");
}

// --- Хранилище заказов (в памяти) ---
const orders = new Map(); // id -> { email, telegram, items, total, method, status }

// --- Генерация ID ---
const genId = () => Math.random().toString(36).slice(2, 10);

// --- Корневой маршрут ---
app.get("/", (req, res) => res.json({ ok: true, msg: "Backend running" }));

// --- Создание нового заказа ---
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

    // --- Инлайн-кнопка "Выполнено" ---
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Выполнено!",
            callback_data: `done_${id}`,
          },
        ],
      ],
    };

    // --- Отправляем заказ в Telegram ---
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
    console.error("❌ Error in /order:", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// --- Обработка нажатия на кнопку "✅ Выполнено" ---
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

        // Уведомляем админа
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: `✅ Заказ *${orderId}* помечен как выполнен.`,
            parse_mode: "Markdown",
          }),
        });

        // Убираем кнопку у сообщения
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
    console.error("❌ Error in Telegram callback:", err);
    res.sendStatus(500);
  }
});

// --- Получение заказов пользователя ---
app.get("/orders/:telegram", (req, res) => {
  const tg = req.params.telegram;
  const userOrders = Array.from(orders.values()).filter((o) => o.telegram === tg);
  res.json({ ok: true, orders: userOrders });
});

// --- Запуск сервера ---
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
