
import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, Key, Bell, BellOff, Settings2, Copy, Users, Link as LinkIcon, CheckCircle2, User, Mail, ShieldCheck, Sparkles, RefreshCcw, Cloud } from 'lucide-react';
import { AppState } from '../types';
import { generateSyncCode, parseSyncCode, sendConnectionSignal } from '../services/firebaseService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  pendingRequest: string | null;
  onAcceptRequest: () => void;
  onDeclineRequest: () => void;
  onRestore: (data: Partial<AppState>) => void;
  onReset: () => void;
  lastSyncTime: number | null;
  onForceSync: () => void;
}

export const SettingsModal: React.FC<Props> = ({ 
  isOpen, onClose, state, pendingRequest, onAcceptRequest, onDeclineRequest, onRestore, onReset, lastSyncTime, onForceSync 
}) => {
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [partnerEmailInput, setPartnerEmailInput] = useState(state.settings.partnerEmail || '');
  const [isLinking, setIsLinking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleNotifications = async () => {
    if (!('Notification' in window)) return;
    if (!state.settings.notificationsEnabled) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onRestore({ settings: { ...state.settings, notificationsEnabled: true } });
      }
    } else {
      onRestore({ settings: { ...state.settings, notificationsEnabled: false } });
    }
  };

  const handleApplySyncCode = () => {
    const data = parseSyncCode(syncCodeInput);
    if (data) {
      onRestore(data);
      setStatus({ type: 'success', message: 'Vault restored!' });
      setSyncCodeInput('');
    } else {
      setStatus({ type: 'error', message: 'Invalid code.' });
    }
    setTimeout(() => setStatus(null), 3000);
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await onForceSync();
    setTimeout(() => setIsRefreshing(false), 800);
    setStatus({ type: 'success', message: 'Cloud Vault Refreshed' });
    setTimeout(() => setStatus(null), 2000);
  };

  const handleConnectPartner = () => {
    if (!partnerEmailInput.includes('@')) {
      setStatus({ type: 'error', message: 'Enter a valid email.' });
      return;
    }
    if (partnerEmailInput.toLowerCase() === state.settings.email.toLowerCase()) {
      setStatus({ type: 'error', message: "Can't link to yourself!" });
      return;
    }
    setIsLinking(true);
    
    setTimeout(() => {
      onRestore({ 
        settings: { 
          ...state.settings, 
          partnerEmail: partnerEmailInput 
        } 
      });

      sendConnectionSignal(state.settings.email, partnerEmailInput);

      setIsLinking(false);
      setStatus({ type: 'success', message: 'Invitation Sent!' });
      setTimeout(() => setStatus(null), 3000);
    }, 1200);
  };

  const handleDisconnectPartner = () => {
    if (confirm("Disconnect partner? You will return to your private vault.")) {
      onRestore({ settings: { ...state.settings, partnerEmail: undefined } });
      setPartnerEmailInput('');
      setStatus({ type: 'info', message: 'Disconnected.' });
      setTimeout(() => setStatus(null), 3000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-950 rounded-t-[3rem] p-8 z-[201] max-w-xl mx-auto max-h-[92vh] overflow-y-auto no-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-900 dark:text-white">
                  <Settings2 size={20} />
                </div>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">Vault Settings</h3>
              </div>
              <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"><X size={24} /></button>
            </div>

            <div className="space-y-6 pb-12">
              {status && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-2xl text-center text-sm font-bold ${status.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : status.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {status.message}
                </motion.div>
              )}

              {/* User Profile Section with Sync Info */}
              <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center shadow-lg">
                    <User size={28} />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Global Identity</p>
                    <p className="text-zinc-900 dark:text-white font-bold truncate text-lg">{state.settings.email || 'Guest User'}</p>
                    {lastSyncTime && (
                      <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-black flex items-center gap-1 mt-1">
                        <CheckCircle2 size={10} className="text-emerald-500" />
                        Last Synced: {new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>

                {state.settings.email && (
                  <button 
                    onClick={handleManualRefresh}
                    className="w-full py-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest hover:bg-zinc-50 active:scale-95 transition-all shadow-sm"
                  >
                    <RefreshCcw size={16} className={`${isRefreshing ? 'animate-spin text-rose-500' : 'text-zinc-400'}`} />
                    Refresh Cloud Vault
                  </button>
                )}
              </div>

              {/* Shared Access Section */}
              <div className="p-6 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-[2.5rem] border border-indigo-500/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest">Shared Vault</p>
                    <p className="text-zinc-900 dark:text-white font-bold">Partner Link</p>
                  </div>
                </div>

                <AnimatePresence>
                  {pendingRequest && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="mb-6 p-5 bg-indigo-600 rounded-[2rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group"
                    >
                      <motion.div 
                        animate={{ opacity: [0, 0.2, 0] }} 
                        transition={{ duration: 2, repeat: Infinity }} 
                        className="absolute inset-0 bg-white" 
                      />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles size={16} className="text-indigo-200 animate-pulse" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Incoming Invite</p>
                        </div>
                        <p className="font-bold mb-4 truncate text-sm">{pendingRequest}</p>
                        <div className="flex gap-2">
                          <button onClick={onAcceptRequest} className="flex-1 py-3 bg-white text-indigo-600 rounded-xl font-black text-xs uppercase flex items-center justify-center gap-2 active:scale-95 transition-all">
                            <LinkIcon size={14} /> Join Vault
                          </button>
                          <button onClick={onDeclineRequest} className="px-4 py-3 bg-indigo-500 text-white rounded-xl font-black text-xs uppercase active:scale-95 transition-all">
                            Ignore
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {state.settings.partnerEmail ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-indigo-500/20">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[150px]">
                          {state.settings.partnerEmail}
                        </span>
                      </div>
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                    <button onClick={handleDisconnectPartner} className="w-full py-3 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-500/5 rounded-xl transition-colors">
                      Disconnect Partner
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {!pendingRequest && <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 leading-relaxed">Enter your partner's vault email to link your lists in real-time across devices.</p>}
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                      <input 
                        type="email" 
                        value={partnerEmailInput} 
                        onChange={(e) => setPartnerEmailInput(e.target.value)} 
                        placeholder="partner@example.com" 
                        className="w-full pl-11 pr-4 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm focus:border-indigo-500 outline-none transition-all text-zinc-900 dark:text-white shadow-inner" 
                      />
                    </div>
                    <button 
                      onClick={handleConnectPartner} 
                      disabled={isLinking || !partnerEmailInput}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-indigo-500/20"
                    >
                      {isLinking ? 'Sending...' : 'Invite Partner'}
                      {!isLinking && <LinkIcon size={16} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Alert Toggle */}
              <div className="p-6 bg-rose-500/5 dark:bg-rose-500/10 rounded-[2.5rem] border border-rose-500/10">
                <div className="flex justify-between items-center">
                   <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${state.settings.notificationsEnabled ? 'bg-rose-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400'}`}>
                        {state.settings.notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
                     </div>
                     <div>
                       <p className="text-xs font-bold text-rose-500 uppercase tracking-widest">Push Alerts</p>
                       <p className="text-zinc-900 dark:text-white font-bold">Daily Reminders</p>
                     </div>
                   </div>
                   <button onClick={toggleNotifications} className={`w-12 h-6 rounded-full flex items-center px-1 transition-all ${state.settings.notificationsEnabled ? 'bg-rose-500 justify-end' : 'bg-zinc-300 dark:bg-zinc-700'}`}>
                      <motion.div layout transition={{ type: "spring", stiffness: 500, damping: 30 }} className="w-4 h-4 bg-white rounded-full shadow-sm" />
                   </button>
                </div>
              </div>

              <div className="p-6 bg-zinc-100 dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800">
                <div className="flex gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900">
                    <Key size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Mirroring</p>
                    <p className="text-zinc-900 dark:text-white font-bold">Device Sync Code</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <button onClick={() => { navigator.clipboard.writeText(generateSyncCode(state)); setStatus({ type: 'success', message: 'Vault code copied!' }); }} className="w-full py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-50 active:scale-95 transition-all">
                    <Copy size={14} /> Copy My Vault Code
                  </button>
                  <div className="relative">
                    <input type="text" value={syncCodeInput} onChange={(e) => setSyncCodeInput(e.target.value)} placeholder="Paste Mirror Code..." className="w-full px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs outline-none focus:border-rose-500 transition-all text-zinc-900 dark:text-white shadow-inner" />
                    <button onClick={handleApplySyncCode} className="absolute right-2 top-1.5 px-3 py-1.5 bg-zinc-900 dark:bg-zinc-200 text-white dark:text-zinc-900 rounded-lg text-[10px] font-bold active:scale-90 transition-all">IMPORT</button>
                  </div>
                </div>
              </div>

              <button onClick={() => { if (confirm("Permanently wipe local data? All cloud progress will be lost if not logged back in.")) onReset(); }} className="w-full flex items-center justify-center p-5 text-red-500/40 font-bold text-xs uppercase tracking-widest hover:text-red-500 transition-colors gap-2">
                <Trash2 size={16} /> Destroy Vault
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
