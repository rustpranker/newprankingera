// index.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "https://www.pranking.xyz";

app.use(cors({
  origin: [FRONTEND_ORIGIN],
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "x-secret"]
}));

// Конфигурация бота
const BOT_TOKEN = process.env.BOT_TOKEN || "8277453489:AAEjGhpEwotl5IagqSH9FGq9gQpbiyRbxeU";
const CHAT_ID = process.env.CHAT_ID || "7991972980";
const PORT = process.env.PORT || 8080;

if (!BOT_TOKEN || !CHAT_ID) {
  console.warn("⚠️ BOT_TOKEN или CHAT_ID не указаны!");
}

// Временное хранилище заказов
let orders = [];

// Проверка сервера
app.get("/", (req, res) => res.json({ ok: true, msg: "Backend running" }));

// Получить все заказы (для фронта)
app.get("/orders", (req, res) => {
  res.json({ ok: true, orders });
});

// Получить заказ по ID
app.get("/orders/:id", (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ ok: false, error: "not_found" });
  res.json({ ok: true, order });
});

// Новый заказ
app.post("/order", async (req, res) => {
  try {
    const { email, telegram, items, total, method } = req.body || {};
    if (!email || !telegram || !items || typeof total === "undefined") {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    // Создаём уникальный ID заказа
    const orderId = Date.now().toString();

    const order = {
      id: orderId,
      email,
      telegram,
      items,
      total,
      method,
      status: "pending",
      created: new Date().toISOString()
    };

    orders.push(order);

    const itemsText = Array.isArray(items)
      ? items.map(it => `• ${it}`).join("\n")
      : String(items);

    const text =
      `🛒 *Новый заказ!* (ID: ${orderId})\n\n` +
      `👤 Telegram: ${telegram}\n` +
      `✉️ Email: ${email}\n` +
      `💳 Метод: ${method || "—"}\n` +
      `📦 Позиции:\n${itemsText}\n\n` +
      `💰 Итого: ${total}\n` +
      `⏰ ${new Date().toLocaleString()}`;

    // Отправляем сообщение в Telegram
    const tgResp = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✅ Выполнено", callback_data: `done_${orderId}` }]
          ]
        }
      })
    });

    const tgJson = await tgResp.json();
    if (!tgJson.ok) {
      console.error("Ошибка Telegram API:", tgJson);
      return res.status(500).json({ ok: false, error: "telegram_error" });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Ошибка /order:", err);
    res.status(500).json({ ok: false, error: "server_error" });
  }
});

// Обработка нажатий на кнопки Telegram
app.post(`/telegram/${BOT_TOKEN}`, async (req, res) => {
  try {
    const body = req.body;

    if (body.callback_query) {
      const cb = body.callback_query;
      const chatId = cb.message.chat.id;
      const data = cb.data;

      // Проверяем callback_data
      if (data.startsWith("done_")) {
        const orderId = data.replace("done_", "");
        const order = orders.find(o => o.id === orderId);
        if (order) {
          order.status = "done";
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `✅ Успешно! Заказ *${orderId}* помечен как выполнен.`,
              parse_mode: "Markdown"
            })
          });
        } else {
          await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: `❌ Ошибка: заказ не найден.`,
              parse_mode: "Markdown"
            })
          });
        }
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Ошибка callback:", err);
    res.json({ ok: false });
  }
});

// Telegram webhook setup
app.get("/setwebhook", async (req, res) => {
  const webhookUrl = `https://${req.hostname}/telegram/${BOT_TOKEN}`;
  const set = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: webhookUrl })
  });
  const json = await set.json();
  res.json(json);
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
