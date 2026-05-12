import { Expense } from '../types';

export interface NotificationSchedule {
  id: string;
  expenseId: string;
  expenseName: string;
  amount: number;
  currency: string;
  dueDate: Date;
  reminderDate: Date;
  type: 'payment_due' | 'usage_reminder';
  message: string;
  scheduled: boolean;
}

export class NotificationService {
  private schedules: Map<string, NotificationSchedule> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startScheduler();
  }

  startScheduler() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    // Check every minute for due notifications
    this.checkInterval = setInterval(() => {
      this.checkAndSendNotifications();
    }, 60000); // 1 minute
  }

  stopScheduler() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async schedulePaymentReminders(expenses: Expense[]): Promise<void> {
    const now = new Date();
    
    for (const expense of expenses) {
      if (expense.status !== 'active' || !expense.reminders.enabled) {
        continue;
      }

      const nextDueDate = this.calculateNextDueDate(expense);
      if (!nextDueDate) continue;

      const reminderDate = new Date(nextDueDate);
      reminderDate.setDate(reminderDate.getDate() - expense.reminders.days_before);

      // Only schedule if reminder date is in the future
      if (reminderDate > now) {
        const schedule: NotificationSchedule = {
          id: `${expense.id}-payment-${reminderDate.getTime()}`,
          expenseId: expense.id,
          expenseName: expense.name,
          amount: expense.cost.amount,
          currency: expense.cost.currency,
          dueDate: nextDueDate,
          reminderDate,
          type: 'payment_due',
          message: this.generatePaymentReminderMessage(expense, nextDueDate),
          scheduled: false,
        };

        this.schedules.set(schedule.id, schedule);
      }
    }
  }

  async scheduleUsageReminders(expenses: Expense[]): Promise<void> {
    const now = new Date();
    
    for (const expense of expenses) {
      if (expense.status !== 'active' || !expense.usage_tracking.enabled) {
        continue;
      }

      const lastConfirmed = expense.usage_tracking.last_confirmed_use
        ? new Date(expense.usage_tracking.last_confirmed_use)
        : null;

      if (!lastConfirmed) {
        // If never confirmed, remind after 30 days
        const reminderDate = new Date(expense.metadata.created_at);
        reminderDate.setDate(reminderDate.getDate() + 30);

        if (reminderDate > now) {
          const schedule: NotificationSchedule = {
            id: `${expense.id}-usage-${reminderDate.getTime()}`,
            expenseId: expense.id,
            expenseName: expense.name,
            amount: expense.cost.amount,
            currency: expense.cost.currency,
            dueDate: reminderDate,
            reminderDate,
            type: 'usage_reminder',
            message: this.generateUsageReminderMessage(expense, 30),
            scheduled: false,
          };

          this.schedules.set(schedule.id, schedule);
        }
      } else {
        const daysSinceConfirmation = Math.floor(
          (now.getTime() - lastConfirmed.getTime()) / (1000 * 60 * 60 * 24)
        );

        const reminderDays = expense.usage_tracking.remind_after_days_unused;
        
        if (daysSinceConfirmation >= reminderDays) {
          // Schedule next reminder
          const reminderDate = new Date(lastConfirmed);
          reminderDate.setDate(reminderDate.getDate() + reminderDays);

          if (reminderDate > now) {
            const schedule: NotificationSchedule = {
              id: `${expense.id}-usage-${reminderDate.getTime()}`,
              expenseId: expense.id,
              expenseName: expense.name,
              amount: expense.cost.amount,
              currency: expense.cost.currency,
              dueDate: reminderDate,
              reminderDate,
              type: 'usage_reminder',
              message: this.generateUsageReminderMessage(expense, daysSinceConfirmation),
              scheduled: false,
            };

            this.schedules.set(schedule.id, schedule);
          }
        }
      }
    }
  }

  private calculateNextDueDate(expense: Expense): Date | null {
    const now = new Date();
    const nextDue = new Date();

    if (expense.billing.due_day) {
      nextDue.setDate(expense.billing.due_day);

      switch (expense.billing.frequency) {
        case 'daily':
          nextDue.setDate(now.getDate() + 1);
          break;
        case 'weekly': {
          const daysUntil = (expense.billing.due_day - now.getDay() + 7) % 7;
          nextDue.setDate(now.getDate() + daysUntil);
          break;
        }
        case 'monthly':
          nextDue.setMonth(now.getMonth() + 1);
          if (nextDue <= now) {
            nextDue.setMonth(nextDue.getMonth() + 1);
          }
          break;
        case 'quarterly':
          nextDue.setMonth(now.getMonth() + 3);
          if (nextDue <= now) {
            nextDue.setMonth(nextDue.getMonth() + 3);
          }
          break;
        case 'yearly':
          nextDue.setFullYear(now.getFullYear() + 1);
          if (nextDue <= now) {
            nextDue.setFullYear(nextDue.getFullYear() + 1);
          }
          break;
      }
    }

    return nextDue > now ? nextDue : null;
  }

  private generatePaymentReminderMessage(expense: Expense, dueDate: Date): string {
    const formattedDate = dueDate.toLocaleDateString();
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: expense.cost.currency,
    }).format(expense.cost.amount);

    return `Payment due: ${expense.name} - ${formattedAmount} on ${formattedDate}`;
  }

  private generateUsageReminderMessage(expense: Expense, daysSinceLastUse: number): string {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: expense.cost.currency,
    }).format(expense.cost.amount);

    return `Usage check: ${expense.name} (${formattedAmount}) - Not used in ${daysSinceLastUse} days`;
  }

  private async checkAndSendNotifications(): Promise<void> {
    const now = new Date();
    const notificationsToSend: NotificationSchedule[] = [];

    for (const schedule of this.schedules.values()) {
      if (!schedule.scheduled && schedule.reminderDate <= now) {
        notificationsToSend.push(schedule);
      }
    }

    for (const notification of notificationsToSend) {
      await this.sendNotification(notification);
      notification.scheduled = true;
    }
  }

  private async sendNotification(schedule: NotificationSchedule): Promise<void> {
    try {
      // Check if browser supports notifications
      if ('Notification' in window) {
        // Request permission if not granted
        if (Notification.permission === 'default') {
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.warn('Notification permission denied');
            return;
          }
        }

        if (Notification.permission === 'granted') {
          const notification = new Notification('LedgerLeaf', {
            body: schedule.message,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: schedule.id,
            requireInteraction: schedule.type === 'payment_due',
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
          };

          // Auto-close after 5 seconds for usage reminders
          if (schedule.type === 'usage_reminder') {
            setTimeout(() => notification.close(), 5000);
          }
        }
      }

      // Also store notification in localStorage for history
      const notificationHistory = JSON.parse(localStorage.getItem('ledgerleaf_notifications') || '[]');
      notificationHistory.push({
        id: schedule.id,
        message: schedule.message,
        type: schedule.type,
        timestamp: new Date().toISOString(),
        expenseId: schedule.expenseId,
        read: false,
      });
      localStorage.setItem('ledgerleaf_notifications', JSON.stringify(notificationHistory));

    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  getScheduledNotifications(): NotificationSchedule[] {
    return Array.from(this.schedules.values());
  }

  getNotificationHistory(): any[] {
    return JSON.parse(localStorage.getItem('ledgerleaf_notifications') || '[]');
  }

  markNotificationAsRead(notificationId: string): void {
    const notifications = this.getNotificationHistory();
    const notification = notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      localStorage.setItem('ledgerleaf_notifications', JSON.stringify(notifications));
    }
  }

  clearNotificationHistory(): void {
    localStorage.removeItem('ledgerleaf_notifications');
  }

  async confirmUsage(expenseId: string): Promise<void> {
    // Mark usage as confirmed
    const confirmationData = JSON.parse(localStorage.getItem('ledgerleaf_usage_confirmations') || '{}');
    confirmationData[expenseId] = new Date().toISOString();
    localStorage.setItem('ledgerleaf_usage_confirmations', JSON.stringify(confirmationData));

    // Remove any pending usage reminders for this expense
    const schedulesToRemove: string[] = [];
    for (const [id, schedule] of this.schedules.entries()) {
      if (schedule.expenseId === expenseId && schedule.type === 'usage_reminder') {
        schedulesToRemove.push(id);
      }
    }

    schedulesToRemove.forEach(id => this.schedules.delete(id));
  }

  getLastUsageConfirmation(expenseId: string): Date | null {
    const confirmations = JSON.parse(localStorage.getItem('ledgerleaf_usage_confirmations') || '{}');
    const timestamp = confirmations[expenseId];
    return timestamp ? new Date(timestamp) : null;
  }
}

// Singleton instance
export const notificationService = new NotificationService();
