<div align="center">

<h1 align="center">TypeAuthd.Bot</h1>

**Telegram-клиент для управления системой авторизации TypeAuthd**

[![Node.js](https://img.shields.io/badge/Node.js-24.15.0-green?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Telegraf](https://img.shields.io/badge/Telegraf-4.16-blue?style=for-the-badge)](https://telegraf.js.org/)

</div>

---

## О проекте

Административный бот для работы с API **TypeAuthd**. Позволяет управлять привязками пользователей, просматривать профили, управлять ролями на серверах Discord и генерировать ссылки для авторизации напрямую через Telegram.

### Основные возможности:
* **Master Message UX**: Работа в режиме одного сообщения для чистоты чата.
* **Smart Lookup**: Параллельный поиск по UUID и Discord ID.
* **Role Resolver**: Отображение названий ролей через интеграцию с Discord API.
* **System Stats**: Мониторинг ресурсов сервера (CPU, RAM, Disk).

## Требования

* **Node.js** v20.0 или выше
* **TypeAuthd API Token**
* **Discord Bot Token** (для отображения названий ролей)

## Установка

```bash
# 1. Клонируйте репозиторий
git clone https://github.com/cryals/typeauthd-bot.git
cd typeauthd-bot

# 2. Установите зависимости
npm install

# 3. Настройте конфигурацию
# Создайте файл settings.ini на основе example.settings.ini
cp example.settings.ini settings.ini
# Отредактируйте settings.ini, указав ваши токены и ID администраторов
```

## Запуск

```bash
# Запуск бота
npm start

# Режим разработки (с автоперезагрузкой)
npm run dev
```

## Лицензия

© **ALS 2026**. Все права защищены.
**ALL RIGHTS RESERVED**.
