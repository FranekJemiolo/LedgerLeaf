import { z } from 'zod';

// Core frequency types
export const FrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one-time']);
export type Frequency = z.infer<typeof FrequencySchema>;

// Cost schema
export const CostSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().length(3).default('USD'),
});

export type Cost = z.infer<typeof CostSchema>;

// Billing schema
export const BillingSchema = z.object({
  frequency: FrequencySchema,
  interval: z.number().positive().default(1),
  due_day: z.number().min(1).max(31).optional(),
});

export type Billing = z.infer<typeof BillingSchema>;

// Reminder schema
export const RemindersSchema = z.object({
  enabled: z.boolean().default(true),
  days_before: z.number().min(0).default(3),
});

export type Reminders = z.infer<typeof RemindersSchema>;

// Usage tracking schema
export const UsageTrackingSchema = z.object({
  enabled: z.boolean().default(true),
  last_confirmed_use: z.string().datetime().optional(),
  remind_after_days_unused: z.number().positive().default(45),
});

export type UsageTracking = z.infer<typeof UsageTrackingSchema>;

// Metadata schema
export const MetadataSchema = z.object({
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Metadata = z.infer<typeof MetadataSchema>;

// Main expense schema
export const ExpenseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['subscription', 'service', 'obligation', 'utility', 'insurance', 'other']).default('other'),
  status: z.enum(['active', 'inactive', 'cancelled', 'paused']).default('active'),
  cost: CostSchema,
  billing: BillingSchema,
  category: z.array(z.string()).default([]),
  reminders: RemindersSchema.default({ enabled: true, days_before: 3 }),
  usage_tracking: UsageTrackingSchema.default({ enabled: true, remind_after_days_unused: 45 }),
  metadata: MetadataSchema,
  notes: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type Expense = z.infer<typeof ExpenseSchema>;

// Config schema
export const ConfigSchema = z.object({
  currency: z.string().length(3).default('USD'),
  default_reminder_days: z.number().min(0).default(3),
  default_unused_days: z.number().positive().default(45),
  app_data_directory: z.string(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type Config = z.infer<typeof ConfigSchema>;

// Import/Export types
export interface ImportMapping {
  name: string;
  amount: string;
  due_date: string;
  category: string;
  frequency: string;
}

export interface ImportResult {
  expenses: Expense[];
  errors: string[];
  warnings: string[];
}

export interface RecurringDetection {
  vendor: string;
  frequency: Frequency;
  confidence: number;
  occurrences: number;
}

// UI state types
export interface DashboardStats {
  totalMonthlyRecurring: number;
  upcomingPayments: Expense[];
  overdueItems: Expense[];
  potentiallyUnusedServices: Expense[];
  categoryBreakdown: Record<string, number>;
}

export interface FilterState {
  search: string;
  categories: string[];
  status: string[];
  frequency: string[];
  tags: string[];
}

export interface SortState {
  field: keyof Expense;
  direction: 'asc' | 'desc';
}

// Notification types
export interface NotificationSchedule {
  expense_id: string;
  type: 'due_reminder' | 'overdue' | 'unused_service';
  scheduled_date: Date;
  message: string;
}

// Date utilities
export interface NextDueDate {
  date: Date;
  daysUntil: number;
  isOverdue: boolean;
}
