import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";

const app = express();
app.use(bodyParser.json());

// Получаем токен и чат из переменных окружения
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

app.get("/", (req, res) => {
  res.send("✅ Backend работает! Telegram интеграция активна.");
});

app.post("/order", async (req, res) => {
  try {
    const { email, telegram, items, total } = req.body;

    if (!email || !telegram || !items || !total) {
      return res.status(400).json({ error: "Не хватает данных в заказе." });
    }

    // Формируем сообщение для Telegram
    const message = `
📦 <b>Новый заказ!</b>

📧 Почта: ${email}
💬 Telegram: ${telegram}

🛍️ Позиции:
${items.map(i => `• ${i.name} — ${i.price}₴`).join("\n")}

💰 <b>Итого:</b> ${total}₴
`;

    // Отправляем в Telegram
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    res.json({ success: true, message: "Заказ отправлен в Telegram!" });
  } catch (err) {
    console.error("Ошибка при отправке заказа:", err);
    res.status(500).json({ error: "Ошибка сервера." });
  }
});

// ⚠️ Railway требует именно process.env.PORT
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`✅ Сервер запущен на порту ${PORT}`));
