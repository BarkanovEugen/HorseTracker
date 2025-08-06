# 🐎 Система мониторинга лошадей

Современная веб-система для отслеживания GPS-местоположения лошадей с использованием ESP32 устройств, умных геозон и системы оповещений.

## ✨ Возможности

- 📍 **Реальное время GPS трекинг** через ESP32 устройства
- 🗺️ **Интерактивная карта** с OpenStreetMap
- 🔄 **Геозоны-полигоны** с автоматическими оповещениями
- 🚨 **Умная система оповещений** с эскалацией
- 📱 **Мобильная адаптация** с touch-интерфейсом
- 🔐 **VK ID авторизация** для безопасного доступа
- ⚡ **WebSocket** для живых обновлений
- 🔋 **Мониторинг батареи** ESP32 устройств

## 🚀 Быстрая установка

### Вариант 1: Автоматическая установка (рекомендуется)

```bash
# Клонирование репозитория
git clone <your-repository-url>
cd horse-tracker

# Запуск автоматической установки
./install.sh
```

Скрипт автоматически:
- Установит Docker и Docker Compose (если нужно)
- Настроит переменные окружения
- Сгенерирует безопасные пароли
- Запустит все сервисы

### Вариант 2: Docker Compose

```bash
# Настройка окружения
cp .env.example .env
# Отредактируйте .env файл

# Запуск
docker-compose up -d

# Просмотр логов
docker-compose logs -f app
```

### Вариант 3: Ручная установка

Подробные инструкции: [DEPLOYMENT.md](DEPLOYMENT.md)

## 🔧 Настройка VK ID

1. Создайте приложение на [dev.vk.com](https://dev.vk.com/)
2. Получите `Client ID` и `Client Secret`
3. Добавьте в `.env` файл:
   ```env
   VK_CLIENT_ID=ваш_client_id
   VK_CLIENT_SECRET=ваш_client_secret
   VK_REDIRECT_URI=https://ваш-домен.com/auth/vk/callback
   ```
4. Перезапустите: `docker-compose restart app`

## 📱 ESP32 интеграция

ESP32 устройства отправляют данные на эндпоинт:

```cpp
POST /api/device/data
{
  "id": "esp32_device_001",
  "x": 55.7558,
  "y": 37.6176,
  "battery": 85
}
```

Устройства автоматически регистрируются при первой отправке данных.

## 🌐 Доступ к приложению

После установки:
- **Основной интерфейс**: http://localhost:5000
- **Страница входа**: http://localhost:5000/login
- **API документация**: см. код в `server/routes.ts`

## 🛠 Управление

```bash
# Просмотр статуса
docker-compose ps

# Логи приложения
docker-compose logs -f app

# Остановка
docker-compose down

# Обновление
git pull && docker-compose up -d --build

# Бэкап базы данных
docker-compose exec db pg_dump -U postgres horse_tracker > backup.sql
```

## 📊 Архитектура

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + WebSocket
- **База данных**: PostgreSQL + Drizzle ORM
- **Карты**: MapLibre GL + OpenStreetMap
- **Авторизация**: VK ID OAuth2
- **Real-time**: WebSocket соединения

## 🔒 Безопасность

- VK ID OAuth2 авторизация
- Сессии на базе PostgreSQL
- HTTPS ready (настройте SSL)
- Rate limiting в Nginx
- Хэширование паролей сессий

## 📚 Документация

- [DEPLOYMENT.md](DEPLOYMENT.md) - Полная инструкция по развертыванию
- [replit.md](replit.md) - Техническая документация и архитектура

## 🤝 Поддержка

При возникновении проблем:
1. Проверьте логи: `docker-compose logs -f`
2. Убедитесь в правильности `.env` конфигурации
3. Проверьте статус сервисов: `docker-compose ps`
4. Создайте issue с описанием проблемы

## 📄 Лицензия

MIT License - используйте свободно для коммерческих и некоммерческих целей.