import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// 🔧 Замени на свои данные:
const BOT_TOKEN = "8277453489:AAEjGhpEwotl5IagqSH9FGq9gQpbiyRbxeU";
const CHAT_ID = "7991972980";

// 💬 Принимаем заказы с сайта
app.post("/api/order", async (req, res) => {
  const { name, telegram, email, total, items } = req.body;

  const text = `
📦 <b>Новый заказ!</b>
👤 Имя: ${name || "—"}
💬 Telegram: ${telegram || "—"}
✉️ Email: ${email || "—"}
💰 Сумма: ${total}₴
🛒 Товары:
${items.map((i) => `• ${i.title} — ${i.price}₴`).join("\n")}
`;

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });

    res.json({ ok: true, message: "Заказ успешно отправлен!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Ошибка при отправке заказа." });
  }
});

// 🔥 Railway запустит это
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
