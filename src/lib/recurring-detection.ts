import { Expense } from '../types';

export interface RecurringPattern {
  pattern: string;
  confidence: number;
  description: string;
  examples: string[];
}

export interface RecurringAnalysis {
  isRecurring: boolean;
  patterns: RecurringPattern[];
  confidence: number;
  suggestedFrequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  suggestedInterval?: number;
  suggestedDueDay?: number;
}

export class RecurringDetectionService {
  private readonly RECURRING_PATTERNS: RecurringPattern[] = [
    {
      pattern: '\\b(?:monthly|mo|monthly payment|monthly fee)',
      confidence: 90,
      description: 'Monthly recurring charges',
      examples: ['Netflix $15.99', 'Spotify Premium $9.99', 'Monthly subscription $29.99']
    },
    {
      pattern: '\\b(?:weekly|wk|weekly payment|weekly fee)',
      confidence: 85,
      description: 'Weekly recurring charges',
      examples: ['Weekly $25.00', 'Gym membership $45/wk', 'Weekly cleaning service $75']
    },
    {
      pattern: '\\b(?:yearly|yr|annual|annually|once per year)',
      confidence: 80,
      description: 'Yearly recurring charges',
      examples: ['Annual subscription $199.99', 'Once per year $599', 'Yearly license $149']
    },
    {
      pattern: '\\b(?:quarterly|qtr|per quarter)',
      confidence: 75,
      description: 'Quarterly recurring charges',
      examples: ['Quarterly $89.99', 'Every 3 months $150', 'Per quarter $45']
    },
    {
      pattern: '\\b(?:daily|day|per day)',
      confidence: 70,
      description: 'Daily recurring charges',
      examples: ['Daily $2.99', 'Per day $1.50', '24-hour access $0.99']
    },
    {
      pattern: '\\b(?:subscription|sub|membership)',
      confidence: 60,
      description: 'Generic subscription indicators',
      examples: ['Pro subscription', 'Premium membership', 'Gold member']
    },
    {
      pattern: '\\b(?:auto|automatic|renew|recurring)',
      confidence: 55,
      description: 'Generic recurring indicators',
      examples: ['Auto-renewal', 'Automatic payment', 'Recurring charge']
    }
  ];

  analyzeExpense(expense: Expense): RecurringAnalysis {
    const name = expense.name.toLowerCase();
    const notes = (expense.notes || '').toLowerCase();
    const tags = expense.tags.map((tag: string) => tag.toLowerCase()).join(' ');
    
    let isRecurring = false;
    const detectedPatterns: RecurringPattern[] = [];
    let totalConfidence = 0;
    let suggestedFrequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | undefined;
    let suggestedInterval: number | undefined;
    let suggestedDueDay: number | undefined;

    // Check existing billing frequency
    if (expense.billing.frequency !== 'one-time') {
      isRecurring = true;
      suggestedFrequency = expense.billing.frequency;
      suggestedInterval = expense.billing.interval;
      suggestedDueDay = expense.billing.due_day;
      totalConfidence = 100;
    }

    // Pattern matching for unknown/explicitly recurring expenses
    this.RECURRING_PATTERNS.forEach(pattern => {
      if (this.matchesPattern(pattern, name, notes, tags)) {
        isRecurring = true;
        detectedPatterns.push(pattern);
        totalConfidence += pattern.confidence;
      }
    });

    // Analyze for frequency suggestions
    if (!suggestedFrequency && detectedPatterns.length > 0) {
      const frequencySuggestion = this.suggestFrequency(detectedPatterns, name, notes);
      if (frequencySuggestion) {
        suggestedFrequency = frequencySuggestion.frequency;
        suggestedInterval = frequencySuggestion.interval;
        suggestedDueDay = frequencySuggestion.dueDay;
      }
    }

    const averageConfidence = detectedPatterns.length > 0 ? totalConfidence / detectedPatterns.length : 0;

    return {
      isRecurring,
      patterns: detectedPatterns,
      confidence: Math.min(averageConfidence, 100),
      suggestedFrequency,
      suggestedInterval,
      suggestedDueDay
    };
  }

  private matchesPattern(pattern: RecurringPattern, name: string, notes: string, tags: string): boolean {
    const searchText = `${name} ${notes} ${tags}`;
    const regex = new RegExp(pattern.pattern, 'i');
    return regex.test(searchText);
  }

  private suggestFrequency(
    patterns: RecurringPattern[], 
    name: string, 
    notes: string
  ): { frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'; interval?: number; dueDay?: number } | null {
    const monthlyPatterns = patterns.filter(p => p.pattern.includes('monthly'));
    const weeklyPatterns = patterns.filter(p => p.pattern.includes('weekly'));
    const dailyPatterns = patterns.filter(p => p.pattern.includes('daily'));
    const yearlyPatterns = patterns.filter(p => p.pattern.includes('yearly'));
    const quarterlyPatterns = patterns.filter(p => p.pattern.includes('quarterly'));

    // Check for explicit frequency mentions
    const nameLower = name.toLowerCase();
    const notesLower = notes.toLowerCase();
    
    if (nameLower.includes('monthly') || notesLower.includes('monthly')) {
      return { frequency: 'monthly', interval: 1, dueDay: this.extractDueDay(notesLower) };
    }
    
    if (nameLower.includes('weekly') || notesLower.includes('weekly')) {
      return { frequency: 'weekly', interval: 1, dueDay: this.extractDueDay(notesLower) };
    }
    
    if (nameLower.includes('daily') || notesLower.includes('daily')) {
      return { frequency: 'daily', interval: 1, dueDay: this.extractDueDay(notesLower) };
    }
    
    if (nameLower.includes('yearly') || notesLower.includes('yearly')) {
      return { frequency: 'yearly', interval: 1, dueDay: this.extractDueDay(notesLower) };
    }
    
    if (nameLower.includes('quarterly') || notesLower.includes('quarterly')) {
      return { frequency: 'quarterly', interval: 3, dueDay: this.extractDueDay(notesLower) };
    }

    // Pattern-based suggestions
    if (monthlyPatterns.length > 0 && monthlyPatterns.length >= weeklyPatterns.length && monthlyPatterns.length > dailyPatterns.length) {
      return { frequency: 'monthly', interval: 1, dueDay: this.extractDueDay(notesLower) };
    }
    
    if (weeklyPatterns.length > 0 && weeklyPatterns.length > monthlyPatterns.length && weeklyPatterns.length > dailyPatterns.length) {
      return { frequency: 'weekly', interval: 1, dueDay: this.extractDueDay(notesLower) };
    }
    
    if (dailyPatterns.length > 0 && dailyPatterns.length > weeklyPatterns.length && dailyPatterns.length > monthlyPatterns.length) {
      return { frequency: 'daily', interval: 1, dueDay: this.extractDueDay(notesLower) };
    }
    
    if (yearlyPatterns.length > 0 && yearlyPatterns.length > monthlyPatterns.length && yearlyPatterns.length > weeklyPatterns.length) {
      return { frequency: 'yearly', interval: 1, dueDay: this.extractDueDay(notesLower) };
    }
    
    if (quarterlyPatterns.length > 0 && quarterlyPatterns.length > monthlyPatterns.length && quarterlyPatterns.length > weeklyPatterns.length) {
      return { frequency: 'quarterly', interval: 3, dueDay: this.extractDueDay(notesLower) };
    }

    return null;
  }

  private extractDueDay(text: string): number | undefined {
    const dueDayRegex = /(?:due|day|date|payment|charge).*?(\d{1,2})(?:st|nd|rd|th)/i;
    const match = text.match(dueDayRegex);
    if (match) {
      const day = parseInt(match[1]);
      if (day >= 1 && day <= 31) {
        return day;
      }
    }
    return undefined;
  }

  detectRecurringExpenses(expenses: Expense[]): {
    recurring: Expense[];
    oneTime: Expense[];
    confidence: number;
    recurringCount: number;
    totalCount: number;
  } {
    const recurring: Expense[] = [];
    const oneTime: Expense[] = [];
    let totalConfidence = 0;
    let validRecurringCount = 0;

    expenses.forEach(expense => {
      const analysis = this.analyzeExpense(expense);
      
      if (analysis.isRecurring) {
        recurring.push(expense);
        totalConfidence += analysis.confidence;
        validRecurringCount++;
      } else {
        oneTime.push(expense);
      }
    });

    const averageConfidence = expenses.length > 0 ? totalConfidence / expenses.length : 0;

    return {
      recurring,
      oneTime,
      confidence: Math.round(averageConfidence),
      recurringCount: validRecurringCount,
      totalCount: expenses.length
    };
  }

  getRecurringPatterns(): RecurringPattern[] {
    return this.RECURRING_PATTERNS;
  }

  categorizeRecurringType(expense: Expense): {
    name: string;
    confidence: number;
  } {
    const name = expense.name.toLowerCase();
    const notes = (expense.notes || '').toLowerCase();
    const searchText = `${name} ${notes}`;

    // Service subscriptions
    if (this.matchesAny(searchText, ['netflix', 'spotify', 'disney+', 'amazon prime', 'apple tv+', 'microsoft 365', 'adobe', 'creative cloud', 'dropbox', 'google drive', 'icloud'])) {
      return { name: 'Streaming/Software Service', confidence: 90 };
    }

    // Utilities
    if (this.matchesAny(searchText, ['electric', 'water', 'gas', 'internet', 'phone', 'cable', 'trash', 'sewage'])) {
      return { name: 'Utility Service', confidence: 85 };
    }

    // Insurance
    if (this.matchesAny(searchText, ['insurance', 'health', 'dental', 'vision', 'life', 'car', 'home', 'renters'])) {
      return { name: 'Insurance', confidence: 85 };
    }

    // Financial services
    if (this.matchesAny(searchText, ['bank', 'loan', 'credit', 'mortgage', 'interest', 'fee', 'finance'])) {
      return { name: 'Financial Service', confidence: 80 };
    }

    // Membership services
    if (this.matchesAny(searchText, ['gym', 'fitness', 'club', 'membership', 'subscription'])) {
      return { name: 'Membership Service', confidence: 75 };
    }

    // Software/License
    if (this.matchesAny(searchText, ['software', 'license', 'saas', 'app', 'tool', 'antivirus', 'vpn'])) {
      return { name: 'Software/License', confidence: 70 };
    }

    // Communication services
    if (this.matchesAny(searchText, ['phone', 'mobile', 'internet', 'wifi', 'cellular'])) {
      return { name: 'Communication Service', confidence: 75 };
    }

    // Other recurring
    return { name: 'Other Recurring', confidence: 50 };
  }

  private matchesAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }

  calculateOptimizationSuggestions(expenses: Expense[]): {
    expenseId: string;
    type: 'cancel' | 'modify' | 'downgrade' | 'consolidate';
    reason: string;
    potentialSavings: number;
    confidence: number;
  }[] {
    const suggestions: {
      expenseId: string;
      type: 'cancel' | 'modify' | 'downgrade' | 'consolidate';
      reason: string;
      potentialSavings: number;
      confidence: number;
    }[] = [];

    expenses.forEach(expense => {
      if (expense.status === 'active' && expense.billing.frequency !== 'one-time') {
        // Check for duplicate or similar services
        const similarExpenses = expenses.filter(other => 
          other.id !== expense.id &&
          other.status === 'active' &&
          this.calculateSimilarity(expense, other) > 0.7
        );

        if (similarExpenses.length > 0) {
          similarExpenses.forEach(similar => {
            const potentialSavings = Math.min(expense.cost.amount, similar.cost.amount);
            const confidence = this.calculateSimilarity(expense, similar) * 100;

            if (potentialSavings > 10) { // Only suggest if savings are significant
              suggestions.push({
                expenseId: expense.id,
                type: 'consolidate',
                reason: `Similar to ${similar.name}. Potential savings: $${potentialSavings.toFixed(2)}/month by consolidating.`,
                potentialSavings,
                confidence
              });
            }
          });
        }

        // Check for unused services (based on usage tracking)
        if (expense.usage_tracking && expense.usage_tracking.enabled) {
          const daysSinceLastUse = this.calculateDaysSinceLastUse(expense);
          const thresholdDays = expense.usage_tracking.remind_after_days_unused || 45;

          if (daysSinceLastUse > thresholdDays) {
            suggestions.push({
              expenseId: expense.id,
              type: 'cancel',
              reason: `Unused for ${daysSinceLastUse} days. Consider canceling this $${expense.cost.amount.toFixed(2)}/${expense.billing.frequency} service.`,
              potentialSavings: expense.cost.amount * 12, // Annual savings
              confidence: 85
            });
          }
        }

        // Check for overpriced services
        const categoryAverage = this.calculateCategoryAverage(expenses, expense.category);
        if (categoryAverage > 0 && expense.cost.amount > categoryAverage * 1.5) {
          suggestions.push({
            expenseId: expense.id,
            type: 'downgrade',
            reason: `Cost is 50% higher than category average. Consider downgrading or switching to a cheaper alternative.`,
            potentialSavings: expense.cost.amount - (categoryAverage * 1.25),
            confidence: 75
          });
        }
      }
    });

    return suggestions;
  }

  private calculateSimilarity(expense1: Expense, expense2: Expense): number {
    let similarity = 0;
    let factors = 0;

    // Name similarity
    if (expense1.name.toLowerCase() === expense2.name.toLowerCase()) {
      similarity += 0.4;
      factors++;
    }

    // Category similarity
    const commonCategories = expense1.category.filter((cat: string) => expense2.category.includes(cat));
    if (commonCategories.length > 0) {
      similarity += (commonCategories.length / Math.max(expense1.category.length, expense2.category.length)) * 0.3;
      factors++;
    }

    // Cost similarity (within 20%)
    const costDiff = Math.abs(expense1.cost.amount - expense2.cost.amount);
    const avgCost = (expense1.cost.amount + expense2.cost.amount) / 2;
    if (costDiff < avgCost * 0.2) {
      similarity += 0.3;
      factors++;
    }

    return factors > 0 ? similarity / factors : 0;
  }

  private calculateDaysSinceLastUse(expense: Expense): number {
    if (!expense.metadata.updated_at) return 999;
    
    const lastUsed = new Date(expense.metadata.updated_at);
    const now = new Date();
    const diffTime = now.getTime() - lastUsed.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
  }

  private calculateCategoryAverage(expenses: Expense[], category: string[]): number {
    const categoryExpenses = expenses.filter((expense: Expense) => 
      expense.category.some((cat: string) => category.includes(cat))
    );
    
    if (categoryExpenses.length === 0) return 0;
    
    const totalCost = categoryExpenses.reduce((sum: number, expense: Expense) => sum + expense.cost.amount, 0);
    return totalCost / categoryExpenses.length;
  }
}

// Singleton instance
export const recurringDetectionService = new RecurringDetectionService();
