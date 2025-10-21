// index.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();

// Разрешаем запросы с фронта
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://www.pranking.xyz";
app.use(cors({
  origin: [FRONTEND_ORIGIN],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-secret"]
}));
app.use(express.json());

// Настройки Telegram
const BOT_TOKEN = process.env.BOT_TOKEN || "8277453489:AAEjGhpEwotl5IagqSH9FGq9gQpbiyRbxeU";
const CHAT_ID = process.env.CHAT_ID || "7991972980";
const PORT = process.env.PORT || 8080;

// Хранилище заказов (в памяти)
const orders = new Map(); // id -> { email, telegram, items, total, method, status }

// Функция для генерации ID
const genId = () => Math.random().toString(36).slice(2, 10);

// Основной маршрут проверки
app.get("/", (req, res) => res.json({ ok: true, msg: "Backend running" }));

// Создание нового заказа
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
      `📦 Позиции:\n${items.map(it => `• ${it}`).join("\n")}\n\n` +
      `💰 Итого: ${total}\n` +
      `⏰ ${new Date().toLocaleString()}`;

    // Кнопка "Выполнено"
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Выполнено!",
            callback_data: `done_${id}`
          }
        ]
      ]
    };

    // Отправка сообщения в Telegram
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "Markdown",
        reply_markup: keyboard
      })
    });

    res.json({ ok: true, orderId: id, status: "pending" });
  } catch (err) {
    console.error("Error in /order:", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// Обработка нажатий кнопок из Telegram
app.post(`/telegram/${BOT_TOKEN}`, async (req, res) => {
  try {
    const { callback_query } = req.body;
    if (!callback_query) return res.sendStatus(200);

    const { id, message, data, from } = callback_query;
    if (data && data.startsWith("done_")) {
      const orderId = data.split("_")[1];
      const order = orders.get(orderId);

      if (order) {
        order.status = "success";

        // Сообщение администратору
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            text: `✅ Успешно! Заказ *${orderId}* помечен как выполнен.`,
            parse_mode: "Markdown"
          })
        });

        // Обновляем кнопку
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: message.chat.id,
            message_id: message.message_id,
            reply_markup: { inline_keyboard: [] }
          })
        });
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Error in Telegram callback:", err);
    res.sendStatus(500);
  }
});

// Получить список заказов для клиента
app.get("/orders/:telegram", (req, res) => {
  const tg = req.params.telegram;
  const userOrders = Array.from(orders.values()).filter(o => o.telegram === tg);
  res.json({ ok: true, orders: userOrders });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
