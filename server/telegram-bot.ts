import TelegramBot from 'node-telegram-bot-api';
import type { Alert, Horse } from '@shared/schema';

class TelegramService {
  private bot: TelegramBot | null = null;
  private botToken: string | null = null;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || null;
    
    if (this.botToken) {
      try {
        this.bot = new TelegramBot(this.botToken, { polling: false });
        console.log('📱 Telegram Bot инициализирован');
      } catch (error) {
        console.error('❌ Ошибка инициализации Telegram Bot:', error);
      }
    } else {
      console.log('⚠️ TELEGRAM_BOT_TOKEN не найден - Telegram уведомления отключены');
    }
  }

  async sendAlertNotification(chatId: string, alert: Alert, horse: Horse): Promise<boolean> {
    if (!this.bot || !chatId) {
      return false;
    }

    try {
      const emoji = this.getAlertEmoji(alert);
      const urgencyText = alert.escalated ? '🚨 КРИТИЧНО' : '⚠️ ВНИМАНИЕ';
      
      const message = `${emoji} ${urgencyText}
      
🐎 Лошадь: *${horse.name}*
📍 Проблема: ${alert.title}
📝 Детали: ${alert.description}
⏰ Время: ${new Date(alert.createdAt!).toLocaleString('ru-RU')}

${alert.escalated ? '❗ Лошадь находится вне безопасной зоны более 2 минут!' : 'Проверьте местоположение лошади.'}`;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

      console.log(`📤 Telegram уведомление отправлено в чат ${chatId}`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка отправки Telegram уведомления:', error);
      return false;
    }
  }

  async sendAlertResolved(chatId: string, alert: Alert, horse: Horse): Promise<boolean> {
    if (!this.bot || !chatId) {
      return false;
    }

    try {
      const message = `✅ ПРОБЛЕМА РЕШЕНА

🐎 Лошадь: *${horse.name}*
📍 Статус: ${alert.title} - ЗАКРЫТО
⏰ Время: ${new Date().toLocaleString('ru-RU')}

Лошадь вернулась в безопасную зону.`;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

      console.log(`📤 Telegram уведомление о решении отправлено в чат ${chatId}`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка отправки Telegram уведомления о решении:', error);
      return false;
    }
  }

  async sendDeviceOfflineNotification(chatId: string, alert: Alert, horse: Horse): Promise<boolean> {
    if (!this.bot || !chatId) {
      return false;
    }

    try {
      const message = `🔋 УСТРОЙСТВО ОТКЛЮЧЕНО

🐎 Лошадь: *${horse.name}*
📡 Проблема: ${alert.title}
📝 Детали: ${alert.description}
⏰ Время: ${new Date(alert.createdAt!).toLocaleString('ru-RU')}

Проверьте состояние GPS устройства.`;

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        disable_web_page_preview: true
      });

      console.log(`📤 Telegram уведомление об отключении устройства отправлено в чат ${chatId}`);
      return true;
    } catch (error) {
      console.error('❌ Ошибка отправки Telegram уведомления об отключении:', error);
      return false;
    }
  }

  private getAlertEmoji(alert: Alert): string {
    switch (alert.type) {
      case 'geofence':
        return alert.escalated ? '🚨' : '⚠️';
      case 'device_offline':
        return '🔋';
      case 'low_battery':
        return '🪫';
      default:
        return '⚠️';
    }
  }

  isEnabled(): boolean {
    return this.bot !== null;
  }
}

export const telegramService = new TelegramService();