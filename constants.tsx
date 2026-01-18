
import React from 'react';

export const CARD_COLORS = [
  'bg-rose-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
  'bg-orange-500'
];

export const INITIAL_SETTINGS = {
  email: '',
  isSubscribed: false,
  theme: 'dark' as const,
  hasOnboarded: false,
  notificationsEnabled: false,
  reminderTime: '17:00'
};

export const COMMON_ITEMS = [
  "Milk", "Bread", "Eggs", "Vegetables", "Fruits", "Water", "Medicine", "Snacks", "Coffee", "Laundry"
];
