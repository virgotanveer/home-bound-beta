import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, Heart, ShieldCheck, Sparkles, Users, Link as LinkIcon } from 'lucide-react';

interface Props {
  onComplete: (email: string, subscribe: boolean, partnerEmail?: string) => void;
}

export const Onboarding: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [subscribe, setSubscribe] = useState(true);

  const next = () => setStep(step + 1);

  return (
    <div className="fixed inset-0 z-[100] bg-white dark:bg-zinc-950 flex items-center justify-center p-6 overflow-hidden">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="text-center max-w-sm"
          >
            <div className="relative w-24 h-24 mx-auto mb-8">
              <motion.div 
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className="w-24 h-24 bg-rose-500 rounded-3xl flex items-center justify-center shadow-rose-500/30 shadow-2xl"
              >
                <Heart size={48} className="text-white fill-current" />
              </motion.div>
              <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-2 rounded-full shadow-lg">
                <ShieldCheck size={16} />
              </div>
            </div>
            <h1 className="text-4xl font-black text-zinc-900 dark:text-white mb-4 tracking-tighter">
              Homebound
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mb-10 leading-relaxed text-lg">
              The smart vault for everything you need to bring back home.
            </p>
            <button
              onClick={next}
              className="w-full py-4 px-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-xl"
            >
              Start Your Vault <ArrowRight size={20} />
            </button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="w-full max-w-sm"
          >
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                 <Sparkles size={16} />
               </div>
               <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Your Identity</h2>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">
              Your email acts as your unique Vault ID. This allows you to sync across devices.
            </p>
            
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  type="email"
                  value={email}
                  autoFocus
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border-2 border-transparent focus:border-rose-500 outline-none transition-all text-zinc-900 dark:text-white"
                />
              </div>

              <div className="p-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${subscribe ? 'bg-rose-500 border-rose-500' : 'border-zinc-300 dark:border-zinc-700'}`}>
                    {subscribe && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={subscribe}
                    onChange={() => setSubscribe(!subscribe)}
                  />
                  <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Daily morning digest (7 AM)</span>
                </label>
              </div>

              <div className="flex items-center gap-2 p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                <ShieldCheck size={14} className="text-emerald-500" />
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Vault-level security active</p>
              </div>

              <button
                onClick={next}
                disabled={!email || !email.includes('@')}
                className="w-full mt-4 py-4 px-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-bold text-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-rose-500/10"
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            className="w-full max-w-sm"
          >
            <div className="flex items-center gap-2 mb-2">
               <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                 <Users size={16} />
               </div>
               <h2 className="text-2xl font-black text-zinc-900 dark:text-white">Shared Vault</h2>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">
              Link with a partner to see and update each other's items in real-time. You can skip this and link later in settings.
            </p>
            
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                <input
                  type="email"
                  value={partnerEmail}
                  autoFocus
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="partner@example.com"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-100 dark:bg-zinc-900 rounded-2xl border-2 border-transparent focus:border-indigo-500 outline-none transition-all text-zinc-900 dark:text-white"
                />
              </div>

              <button
                onClick={() => onComplete(email, subscribe, partnerEmail)}
                disabled={!partnerEmail || !partnerEmail.includes('@')}
                className="w-full mt-4 py-4 px-8 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2"
              >
                <LinkIcon size={20} /> Connect Partner
              </button>

              <button
                onClick={() => onComplete(email, subscribe)}
                className="w-full py-4 px-8 text-zinc-500 dark:text-zinc-400 font-bold text-sm uppercase tracking-widest hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};