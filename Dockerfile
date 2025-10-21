# Используем Node.js 18
FROM node:18

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и устанавливаем зависимости
COPY package*.json ./
RUN npm install --production

# Копируем исходный код
COPY . .

# Указываем порт
EXPOSE 8080

# Запуск
CMD ["npm", "start"]
