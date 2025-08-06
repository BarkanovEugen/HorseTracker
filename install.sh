#!/bin/bash

# 🐎 Скрипт быстрой установки системы мониторинга лошадей
# Автоматизированная установка с Docker

set -e

echo "🐎 Система мониторинга лошадей - Установка"
echo "=========================================="

# Проверка системных требований
check_requirements() {
    echo "🔍 Проверка системных требований..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker не установлен. Устанавливаю Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        echo "✅ Docker установлен"
    else
        echo "✅ Docker найден"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo "❌ Docker Compose не установлен. Устанавливаю..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo "✅ Docker Compose установлен"
    else
        echo "✅ Docker Compose найден"
    fi
}

# Создание .env файла
setup_environment() {
    echo "⚙️  Настройка переменных окружения..."
    
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "📝 Создан .env файл из шаблона"
        
        # Генерация случайных секретов
        DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
        SESSION_SECRET=$(openssl rand -base64 64 | tr -d "=+/")
        
        # Обновление .env файла
        sed -i "s/your_secure_database_password/$DB_PASSWORD/g" .env
        sed -i "s/your-very-secure-session-secret-change-this-to-random-string/$SESSION_SECRET/g" .env
        
        echo "🔐 Сгенерированы случайные пароли"
        
        # Запрос VK настроек
        echo ""
        echo "🔑 Настройка VK ID авторизации"
        echo "Если у вас есть приложение ВКонтакте, введите данные:"
        echo "(Можно пропустить и настроить позже в .env файле)"
        echo ""
        
        read -p "VK Client ID (или пустая строка для пропуска): " vk_client_id
        read -p "VK Client Secret (или пустая строка для пропуска): " vk_client_secret
        read -p "Ваш домен (например: mydomain.com): " domain
        
        if [ ! -z "$vk_client_id" ]; then
            sed -i "s/your_vk_app_id/$vk_client_id/g" .env
        fi
        
        if [ ! -z "$vk_client_secret" ]; then
            sed -i "s/your_vk_app_secret/$vk_client_secret/g" .env
        fi
        
        if [ ! -z "$domain" ]; then
            sed -i "s|https://ваш-домен.com|https://$domain|g" .env
        fi
        
        echo "✅ Переменные окружения настроены"
    else
        echo "⚠️  .env файл уже существует, пропускаю настройку"
    fi
}

# Запуск приложения
start_application() {
    echo "🚀 Запуск приложения..."
    
    # Остановка предыдущих контейнеров (если есть)
    docker-compose down 2>/dev/null || true
    
    # Запуск сервисов
    docker-compose up -d --build
    
    echo "⏳ Ожидание запуска сервисов..."
    sleep 10
    
    # Проверка статуса
    if docker-compose ps | grep -q "Up"; then
        echo "✅ Приложение успешно запущено!"
        echo ""
        echo "🌐 Доступ к приложению:"
        echo "   • http://localhost:5000 - основной интерфейс"
        echo "   • http://localhost:5000/login - страница входа"
        echo ""
        echo "📊 Управление:"
        echo "   • docker-compose ps          - статус сервисов"
        echo "   • docker-compose logs -f app - логи приложения"
        echo "   • docker-compose down        - остановка"
        echo "   • docker-compose up -d       - запуск"
        echo ""
        echo "⚙️  Конфигурация:"
        echo "   • .env                        - настройки окружения"
        echo "   • DEPLOYMENT.md              - подробная документация"
        echo ""
        
        # Проверка VK ID настроек
        if grep -q "your_vk_app_id" .env; then
            echo "⚠️  ВНИМАНИЕ: VK ID не настроен!"
            echo "   Отредактируйте .env файл и перезапустите:"
            echo "   docker-compose down && docker-compose up -d"
        fi
        
    else
        echo "❌ Ошибка при запуске. Проверьте логи:"
        echo "docker-compose logs"
    fi
}

# Основная функция
main() {
    echo "Начинаю установку..."
    echo ""
    
    check_requirements
    echo ""
    
    setup_environment
    echo ""
    
    start_application
    
    echo ""
    echo "🎉 Установка завершена!"
    echo "Подробная документация: DEPLOYMENT.md"
}

# Запуск только если скрипт выполняется напрямую
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi