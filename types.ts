
export enum Frequency {
  DAILY = 'DAILY',
  ALTERNATE = 'ALTERNATE',
  WEEKLY = 'WEEKLY',
  ONE_TIME = 'ONE_TIME',
  CUSTOM = 'CUSTOM'
}

export interface Task {
  id: string;
  name: string;
  frequency: Frequency;
  color: string;
  createdAt: number;
  lastDismissed?: number;
  isActive: boolean;
}

export interface UserSettings {
  email: string;
  partnerEmail?: string;
  isSubscribed: boolean;
  theme: 'light' | 'dark';
  hasOnboarded: boolean;
  notificationsEnabled: boolean;
  reminderTime: string; // HH:mm format
}

export interface AppState {
  tasks: Task[];
  settings: UserSettings;
  todayList: string[]; // Persisted items swiped right today
  lastResetTimestamp: number; // To track daily automatic resets
}
