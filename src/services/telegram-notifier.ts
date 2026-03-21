export interface TelegramMessage {
  text: string;
  chatId: string;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: InlineKeyboardMarkup;
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface LoopStartedNotification {
  workflowSlug: string;
  workflowType: 'brownfield' | 'greenfield';
  maxIterations: number;
  timeoutHours: number;
  dashboardUrl: string;
}

export interface IterationFailedNotification {
  workflowSlug: string;
  iterationNumber: number;
  maxIterations: number;
  assertionFailures: string[];
  runtimeErrors: string[];
}

export interface LoopCompletedNotification {
  workflowSlug: string;
  status: 'PASS' | 'EXHAUSTED' | 'ABORTED' | 'TIMEOUT';
  iterationsCompleted: number;
  maxIterations: number;
  reportUrl?: string;
}

export class TelegramNotifier {
  private readonly botToken: string;
  private readonly chatId: string;
  private readonly baseUrl: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
    this.chatId = process.env.TELEGRAM_CHAT_ID || '-1003879297278';
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;

    if (!this.botToken) {
      console.warn('TELEGRAM_BOT_TOKEN not configured, notifications will be logged only');
    }
  }

  async notifyLoopStarted(notification: LoopStartedNotification): Promise<void> {
    const message = this.buildLoopStartedMessage(notification);
    await this.sendMessage(message);
  }

  async notifyIterationFailed(notification: IterationFailedNotification): Promise<void> {
    const message = this.buildIterationFailedMessage(notification);
    await this.sendMessage(message);
  }

  async notifyLoopCompleted(notification: LoopCompletedNotification): Promise<void> {
    const message = this.buildLoopCompletedMessage(notification);
    await this.sendMessage(message);
  }

  private buildLoopStartedMessage(notification: LoopStartedNotification): TelegramMessage {
    let text = '🔁 *Ralph Loop started*\n\n';
    text += `Workflow: \`${notification.workflowSlug}\` (${notification.workflowType})\n`;
    text += `Max iterations: ${notification.maxIterations} | Timeout: ${notification.timeoutHours}hr inactivity\n`;
    text += `📊 Dashboard: ${notification.dashboardUrl}`;

    return {
      text,
      chatId: this.chatId,
      parseMode: 'Markdown'
    };
  }

  private buildIterationFailedMessage(notification: IterationFailedNotification): TelegramMessage {
    let text = `🔁 *Ralph Loop — Iteration ${notification.iterationNumber}/${notification.maxIterations}*\n\n`;
    text += `Workflow: \`${notification.workflowSlug}\`\n`;

    if (notification.assertionFailures.length > 0) {
      text += `❌ ${notification.assertionFailures.join(', ')}\n`;
    }

    if (notification.runtimeErrors.length > 0) {
      text += `⚠️ Runtime: ${notification.runtimeErrors.join(', ')}\n`;
    } else {
      text += '⚠️ Runtime: none\n';
    }

    text += '🔧 Attempting auto-fix...';

    return {
      text,
      chatId: this.chatId,
      parseMode: 'Markdown'
    };
  }

  private buildLoopCompletedMessage(notification: LoopCompletedNotification): TelegramMessage {
    let text = '';
    let replyMarkup: InlineKeyboardMarkup | undefined;

    switch (notification.status) {
      case 'PASS':
        text = `✅ *Ralph Loop passed — Iteration ${notification.iterationsCompleted}/${notification.maxIterations}*\n\n`;
        text += `Workflow: \`${notification.workflowSlug}\`\n`;
        text += 'All assertions passed. Ready for approval gate.\n';
        if (notification.reportUrl) {
          text += `📄 Report: ${notification.reportUrl}`;
        }
        break;

      case 'EXHAUSTED':
      case 'ABORTED':
      case 'TIMEOUT':
        const statusEmoji = notification.status === 'TIMEOUT' ? '⏱️' : '⛔';
        const statusText = notification.status === 'TIMEOUT' ? 'timed out' :
                          notification.status === 'ABORTED' ? 'aborted' : 'exhausted';

        text = `${statusEmoji} *Ralph Loop ${statusText}*\n\n`;
        text += `Workflow: \`${notification.workflowSlug}\`\n`;
        text += `Iterations completed: ${notification.iterationsCompleted}/${notification.maxIterations}\n`;
        if (notification.reportUrl) {
          text += `📄 Report: ${notification.reportUrl}\n`;
        }

        replyMarkup = {
          inline_keyboard: [[
            { text: '🔁 Restart loop', callback_data: `restart_loop:${notification.workflowSlug}` }
          ]]
        };
        break;
    }

    return {
      text,
      chatId: this.chatId,
      parseMode: 'Markdown',
      replyMarkup
    };
  }

  private async sendMessage(message: TelegramMessage): Promise<void> {
    if (!this.botToken) {
      console.log('Telegram message (not sent, no bot token):', message.text);
      return;
    }

    try {
      const response = await fetch(`${this.baseUrl}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chat_id: message.chatId,
          text: message.text,
          parse_mode: message.parseMode,
          reply_markup: message.replyMarkup
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Telegram API error ${response.status}: ${error}`);
      }

      console.log('Telegram message sent successfully');
    } catch (error) {
      console.error('Failed to send Telegram message:', error);
      // Don't throw - notification failures shouldn't break the main flow
    }
  }

  async registerAbortHandler(loopId: string, onAbort: (loopId: string) => void): Promise<void> {
    // This would typically register a callback handler for inline button presses
    // For now, we'll simulate the handler registration
    console.log(`Registered abort handler for loop ${loopId}`);

    // In a real implementation, this would set up a webhook or polling mechanism
    // to listen for callback queries from the Telegram bot
  }
}