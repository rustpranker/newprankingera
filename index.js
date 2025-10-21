import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use(express.static("public")); // твой frontend в папке public

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

let orders = []; // временная "база данных" в памяти

// --- Принятие заказа с сайта ---
app.post("/api/order", (req, res) => {
  const { name, description } = req.body;
  if (!name || !description) {
    return res.status(400).json({ error: "Заполните все поля" });
  }

  const id = Date.now();
  const order = {
    id,
    name,
    description,
    status: "pending",
  };

  orders.push(order);

  // отправка в Telegram
  const text = `📦 Новый заказ!\n\n👤 Имя: ${name}\n📝 Описание: ${description}\n\nЧтобы отметить как выполнено, нажми /done_${id}`;
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      reply_markup: {
        inline_keyboard: [[{ text: "✅ Выполнено", callback_data: `done_${id}` }]],
      },
    }),
  });

  res.json({ success: true, id });
});

// --- Подтверждение заказа через сайт ---
app.post("/api/order/confirm/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const order = orders.find(o => o.id === id);
  if (!order) return res.status(404).json({ error: "Заказ не найден" });

  order.status = "success";

  // уведомим в Telegram
  fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text: `✅ Клиент подтвердил получение заказа #${id}`,
    }),
  });

  res.json({ success: true });
});

// --- Получение всех заказов ---
app.get("/api/orders", (req, res) => {
  res.json(orders);
});

// --- Telegram webhook ---
app.post(`/webhook/${BOT_TOKEN}`, async (req, res) => {
  const update = req.body;
  if (update.callback_query) {
    const data = update.callback_query.data;
    if (data.startsWith("done_")) {
      const id = parseInt(data.split("_")[1]);
      const order = orders.find(o => o.id === id);
      if (order) order.status = "success";

      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: update.callback_query.message.chat.id,
          text: `✅ Заказ #${id} помечен как выполненный.`,
        }),
      });
    }
  }
  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
