import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { Frequency } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, freq: Frequency) => void;
}

export const AddTaskModal: React.FC<Props> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [freq, setFreq] = useState<Frequency>(Frequency.DAILY);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return;
    onAdd(name, freq);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setName('');
    setFreq(Frequency.DAILY);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[200]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 250 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 rounded-t-[3.5rem] p-8 z-[201] max-w-xl mx-auto shadow-2xl overflow-hidden"
          >
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tighter">New Item</h3>
              <div className="flex gap-3">
                <button onClick={onClose} className="p-3 text-zinc-400 hover:text-zinc-600 transition-colors">
                  <X size={26} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-2">Description</label>
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="What's the mission?"
                    className="w-full px-7 py-5 bg-zinc-100 dark:bg-zinc-800 rounded-[1.8rem] border-2 border-transparent focus:border-rose-500 outline-none transition-all text-2xl font-black text-zinc-900 dark:text-white shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-5">
                <div className="flex justify-between items-center px-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Cadence</label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Object.values(Frequency).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFreq(f)}
                      className={`py-4 px-4 rounded-[1.2rem] text-xs font-black uppercase tracking-widest border-2 transition-all ${freq === f ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-transparent border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-200'}`}
                    >
                      {f.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={!name.trim()}
                className="w-full py-6 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-[1.8rem] font-black text-xl flex items-center justify-center gap-3 shadow-2xl transition-all disabled:opacity-30 tracking-tight"
              >
                <Plus size={28} /> Add to Vault
              </motion.button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};