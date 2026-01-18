
import React from 'react';
import { Sun, Moon } from 'lucide-react';

interface Props {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

export const ThemeToggle: React.FC<Props> = ({ theme, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg text-zinc-900 dark:text-zinc-100 transition-all hover:scale-110 active:scale-95"
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};
