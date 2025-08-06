# 🐎 Развертывание системы мониторинга лошадей

Подробная инструкция по развертыванию приложения на собственном сервере.

## 🚀 Быстрый старт с Docker

### Системные требования
- Docker 20.10+
- Docker Compose 2.0+
- 2GB RAM
- 10GB свободного места

### 1. Клонирование проекта
```bash
git clone <your-repository-url>
cd horse-tracker
```

### 2. Настройка переменных окружения
```bash
cp .env.example .env
```

Отредактируйте `.env` файл:
```bash
# Обязательные настройки
DB_PASSWORD=ваш_надежный_пароль_бд
SESSION_SECRET=очень-длинный-случайный-секрет-для-сессий
VK_CLIENT_ID=ваш_id_приложения_вк
VK_CLIENT_SECRET=ваш_секретный_ключ_вк
VK_REDIRECT_URI=https://ваш-домен.com/auth/vk/callback

# Опциональные
PORT=5000
```

### 3. Запуск
```bash
# Запуск всех сервисов
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f app
```

### 4. Проверка работы
Откройте браузер: `http://localhost:5000`

---

## 🛠 Ручная установка (без Docker)

### Системные требования
- Node.js 18+
- PostgreSQL 13+
- npm 8+

### 1. Установка зависимостей
```bash
# Клонирование проекта
git clone <your-repository-url>
cd horse-tracker

# Установка зависимостей
npm install
```

### 2. Настройка базы данных
```bash
# Создание базы данных PostgreSQL
sudo -u postgres createdb horse_tracker

# Настройка переменных окружения
cp .env.example .env
# Отредактируйте .env файл
```

### 3. Инициализация схемы БД
```bash
# Применение миграций
npm run db:push
```

### 4. Сборка и запуск
```bash
# Сборка фронтенда (если есть build скрипт)
npm run build

# Запуск в продакшн режиме
npm start

# Или для разработки
npm run dev
```

---

## 🌐 Настройка VK ID

### 1. Создание приложения ВКонтакте
1. Перейдите на [dev.vk.com](https://dev.vk.com/)
2. Войдите в аккаунт ВКонтакте
3. Нажмите "Создать приложение"
4. Выберите тип "Веб-сайт"
5. Заполните название и описание

### 2. Получение ключей
1. В настройках приложения найдите:
   - **ID приложения** → это ваш `VK_CLIENT_ID`
   - **Защищённый ключ** → это ваш `VK_CLIENT_SECRET`

### 3. Настройка Redirect URI
1. В разделе "Настройки" → "Redirect URI"
2. Добавьте: `https://ваш-домен.com/auth/vk/callback`
3. Для тестирования: `http://localhost:5000/auth/vk/callback`

---

## 🔧 Конфигурация для продакшна

### SSL/HTTPS настройка
1. Получите SSL сертификат (Let's Encrypt, Cloudflare, и т.д.)
2. Поместите файлы в папку `ssl/`
3. Раскомментируйте HTTPS секцию в `nginx.conf`
4. Обновите `VK_REDIRECT_URI` на HTTPS

### Переменные окружения продакшна
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:password@db-host:5432/horse_tracker
SESSION_SECRET=очень-длинный-случайный-секрет-минимум-32-символа
VK_REDIRECT_URI=https://yourdomain.com/auth/vk/callback
```

### Бэкапы базы данных
```bash
# Создание бэкапа
docker-compose exec db pg_dump -U postgres horse_tracker > backup.sql

# Восстановление
docker-compose exec -T db psql -U postgres horse_tracker < backup.sql
```

---

## 📱 Настройка ESP32 устройств

ESP32 устройства должны отправлять данные на ваш сервер:

### Endpoint для GPS данных
```
POST https://ваш-домен.com/api/device/data
Content-Type: application/json

{
  "id": "esp32_device_001",
  "x": 55.7558,
  "y": 37.6176,
  "battery": 85
}
```

### Пример кода для ESP32
```cpp
#include <WiFi.h>
#include <HTTPClient.h>

void sendGPSData(float lat, float lon, int battery) {
  HTTPClient http;
  http.begin("https://ваш-домен.com/api/device/data");
  http.addHeader("Content-Type", "application/json");
  
  String payload = "{\"id\":\"esp32_001\",\"x\":" + String(lat) + 
                  ",\"y\":" + String(lon) + ",\"battery\":" + String(battery) + "}";
  
  int httpResponseCode = http.POST(payload);
  http.end();
}
```

---

## 🔍 Мониторинг и логи

### Просмотр логов
```bash
# Логи приложения
docker-compose logs -f app

# Логи базы данных
docker-compose logs -f db

# Логи Nginx
docker-compose logs -f nginx
```

### Проверка состояния
```bash
# Статус сервисов
docker-compose ps

# Использование ресурсов
docker stats

# Проверка базы данных
docker-compose exec db psql -U postgres -d horse_tracker -c "SELECT COUNT(*) FROM horses;"
```

---

## 🛡 Безопасность

### Рекомендации
1. **Смените пароли по умолчанию**
2. **Используйте HTTPS в продакшне**
3. **Настройте файервол** (разрешите только порты 80, 443, 22)
4. **Регулярно обновляйте зависимости**
5. **Делайте бэкапы базы данных**

### Обновление
```bash
# Остановка сервисов
docker-compose down

# Обновление кода
git pull origin main

# Пересборка и запуск
docker-compose up -d --build
```

---

## 🆘 Решение проблем

### Приложение не запускается
```bash
# Проверка логов
docker-compose logs app

# Проверка переменных окружения
docker-compose exec app env | grep VK_
```

### Проблемы с базой данных
```bash
# Проверка подключения к БД
docker-compose exec app npx drizzle-kit studio

# Пересоздание схемы
docker-compose exec app npm run db:push
```

### VK ID не работает
1. Проверьте правильность `VK_CLIENT_ID` и `VK_CLIENT_SECRET`
2. Убедитесь, что `VK_REDIRECT_URI` совпадает с настройками приложения ВК
3. Проверьте, что приложение ВК активно

---

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи сервисов
2. Убедитесь в правильности конфигурации
3. Проверьте доступность портов
4. Создайте issue в репозитории с описанием проблемы и логами