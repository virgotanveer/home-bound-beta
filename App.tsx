import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue } from 'framer-motion';
import { Plus, List, Settings, RotateCcw, Heart, Trash2, X, RefreshCw, CheckCircle2, Moon, Sun, Cloud, AlertCircle, Loader2 } from 'lucide-react';
import { Task, Frequency, AppState } from './types';
import { INITIAL_SETTINGS, CARD_COLORS } from './constants';
import { Onboarding } from './components/Onboarding';
import { AddTaskModal } from './components/AddTaskModal';
import { TaskCard } from './components/TaskCard';
import { ThemeToggle } from './components/ThemeToggle';
import { SettingsModal } from './components/SettingsModal';
import { syncToCloud, subscribeToCloudChanges, subscribeToSignals, clearSignal, fetchFromCloud, sendConnectionSignal } from './services/firebaseService';

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem('homebound_state');
      if (saved && saved !== 'null') {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
            settings: { ...INITIAL_SETTINGS, ...(parsed.settings || {}) },
            todayList: Array.isArray(parsed.todayList) ? parsed.todayList : [],
            lastResetTimestamp: parsed.lastResetTimestamp || Date.now()
          };
        }
      }
    } catch (e: any) {
      console.warn("Homebound: Local storage load error", e);
    }
    return { tasks: [], settings: INITIAL_SETTINGS, todayList: [], lastResetTimestamp: Date.now() };
  });

  const [isAdding, setIsAdding] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingPartnerRequest, setPendingPartnerRequest] = useState<string | null>(null);
  
  const lastUpdateRef = useRef<number>(Date.now());
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingRef = useRef(false);
  const topCardX = useMotionValue(0);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); setSyncStatus('idle'); };
    const handleOffline = () => { setIsOnline(false); setSyncStatus('idle'); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const performSync = useCallback(async (force = false) => {
    if (!state.settings.email || !state.settings.hasOnboarded || !navigator.onLine) {
      setSyncStatus('idle');
      return;
    }
    if (isSyncingRef.current && !force) return;
    isSyncingRef.current = true;
    setSyncStatus('syncing');
    try {
      await syncToCloud({ ...state, lastUpdated: lastUpdateRef.current });
      setSyncStatus('synced');
      setLastSyncTime(Date.now());
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e: any) {
      console.warn("Homebound: Sync failure ignored", e?.message || e);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    } finally {
      isSyncingRef.current = false;
    }
  }, [state]);

  useEffect(() => {
    if (!isReady) return;
    localStorage.setItem('homebound_state', JSON.stringify(state));
    
    // Increased debounce time to reduce network congestion
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => performSync(), 8000);
  }, [state, performSync, isReady]);

  useEffect(() => {
    const init = async () => {
      if (state.settings.email && navigator.onLine) {
        try {
          const cloudData = await fetchFromCloud(state.settings.email, state.settings.partnerEmail);
          if (cloudData && cloudData.lastUpdated > lastUpdateRef.current) {
            lastUpdateRef.current = cloudData.lastUpdated;
            setState(prev => {
              const cloudTasks: Task[] = Array.isArray(cloudData.tasks) ? cloudData.tasks : [];
              const localTasks: Task[] = Array.isArray(prev.tasks) ? prev.tasks : [];
              const mergedTasks: Task[] = [...localTasks];
              cloudTasks.forEach((ct: Task) => {
                if (!mergedTasks.find((lt: Task) => lt.id === ct.id)) mergedTasks.push(ct);
              });
              return { 
                ...prev, 
                ...cloudData,
                tasks: mergedTasks,
                todayList: Array.from(new Set([...prev.todayList, ...(Array.isArray(cloudData.todayList) ? cloudData.todayList : [])]))
              };
            });
          }
        } catch (e: any) {
          console.warn("Homebound: Initial cloud fetch failed", e?.message || e);
        }
      }
      setIsReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!isReady || !state.settings.email || !navigator.onLine) return;
    const unsubSignals = subscribeToSignals(state.settings.email, setPendingPartnerRequest);
    const unsubCloud = subscribeToCloudChanges(state.settings.email, state.settings.partnerEmail, (data: any) => {
      if (data && data.lastUpdated > lastUpdateRef.current) {
        lastUpdateRef.current = data.lastUpdated;
        setState(prev => ({ ...prev, ...data, tasks: Array.isArray(data.tasks) ? data.tasks : prev.tasks }));
      }
    });
    return () => { unsubSignals(); unsubCloud(); };
  }, [isReady, state.settings.email, state.settings.partnerEmail, isOnline]);

  const addTask = (name: string, frequency: Frequency) => {
    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      name, 
      frequency,
      color: CARD_COLORS[state.tasks.length % CARD_COLORS.length],
      createdAt: Date.now(),
      isActive: true
    };
    lastUpdateRef.current = Date.now();
    setState(prev => ({ ...prev, tasks: [newTask, ...prev.tasks] }));
  };

  const resetToday = () => {
    lastUpdateRef.current = Date.now();
    setState(prev => ({ 
      ...prev, 
      todayList: [], 
      tasks: prev.tasks.map(t => ({...t, lastDismissed: undefined})) 
    }));
  };

  const handleSwipe = (id: string, direction: 'left' | 'right') => {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    lastUpdateRef.current = Date.now();
    setState(prev => {
      const newTodayList = direction === 'right' ? Array.from(new Set([...prev.todayList, task.name])) : prev.todayList;
      return {
        ...prev,
        todayList: newTodayList,
        tasks: prev.tasks.map(t => t.id === id ? { ...t, lastDismissed: Date.now() } : t)
      };
    });
    topCardX.set(0);
  };

  const activeTasks = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const tasks = Array.isArray(state.tasks) ? state.tasks : [];
    return tasks.filter(t => {
      if (!t || !t.isActive) return false;
      return !t.lastDismissed || t.lastDismissed < todayStart;
    });
  }, [state.tasks]);

  if (!state.settings.hasOnboarded) {
    return <Onboarding onComplete={(email, sub, partnerEmail) => {
      const sanitizedEmail = email.toLowerCase().trim();
      const sanitizedPartner = partnerEmail?.toLowerCase().trim();
      
      setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          email: sanitizedEmail,
          partnerEmail: sanitizedPartner || undefined,
          isSubscribed: sub,
          hasOnboarded: true
        }
      }));

      if (sanitizedPartner) {
        sendConnectionSignal(sanitizedEmail, sanitizedPartner);
      }
    }} />;
  }

  if (!isReady) return null;

  return (
    <div className={`min-h-screen transition-colors duration-500 ${state.settings.theme === 'dark' ? 'bg-[#09090b] text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 p-6 flex justify-between items-start z-50">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#f43f5e] rounded-lg flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Heart size={16} className="text-white fill-current" />
            </div>
            <h1 className="text-lg font-bold tracking-tight leading-none text-white">Homebound</h1>
          </div>
          <div className="flex items-center gap-2 mt-1.5 ml-0.5">
             <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[8px] font-black uppercase tracking-widest opacity-60 text-white">VAULT ACTIVE</span>
             </div>
             
             <AnimatePresence mode="wait">
               {syncStatus !== 'idle' && (
                 <motion.div 
                   initial={{ opacity: 0, x: -5 }} 
                   animate={{ opacity: 1, x: 0 }} 
                   exit={{ opacity: 0, x: 5 }}
                   className="flex items-center gap-1"
                 >
                   <span className="w-1 h-1 rounded-full bg-zinc-600" />
                   {syncStatus === 'syncing' && (
                     <div className="flex items-center gap-1">
                        <Loader2 size={10} className="text-amber-500 animate-spin" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-amber-500">Syncing</span>
                     </div>
                   )}
                   {syncStatus === 'synced' && (
                     <div className="flex items-center gap-1">
                        <Cloud size={10} className="text-emerald-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Synced</span>
                     </div>
                   )}
                   {syncStatus === 'error' && (
                     <div className="flex items-center gap-1">
                        <AlertCircle size={10} className="text-rose-500" />
                        <span className="text-[8px] font-black uppercase tracking-widest text-rose-500">Sync Error</span>
                     </div>
                   )}
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>
        
        <div className="flex gap-2 text-white">
          <button 
            onClick={() => setState(prev => ({ ...prev, settings: { ...prev.settings, theme: prev.settings.theme === 'light' ? 'dark' : 'light' } }))}
            className="p-2.5 rounded-full bg-white/5 border border-white/10 text-inherit active:scale-95 transition-all"
          >
             {state.settings.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={() => setShowSummary(true)} className="p-2.5 rounded-full bg-white/5 border border-white/10 text-inherit active:scale-95 transition-all">
             <List size={20} />
          </button>
        </div>
      </div>

      <main className="pt-24 pb-40 px-6 max-w-md mx-auto h-screen flex flex-col items-center justify-center relative">
        <AnimatePresence mode="popLayout">
          {activeTasks.length > 0 ? (
            <div className="w-full relative flex-1 flex items-center justify-center">
              {activeTasks.slice(0, 3).reverse().map((task, idx, arr) => (
                <TaskCard 
                  key={task.id}
                  task={task}
                  index={idx}
                  total={arr.length}
                  isTop={idx === arr.length - 1}
                  sharedX={topCardX}
                  onSwipe={handleSwipe}
                />
              ))}
            </div>
          ) : (
            <motion.div 
              key="empty-state"
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="w-full bg-[#111111] rounded-[3rem] p-10 flex flex-col items-center text-center shadow-2xl border border-white/5"
            >
              <div className="w-20 h-20 bg-[#0a2319] rounded-full flex items-center justify-center mb-8">
                <RotateCcw size={40} className="text-[#34d399]" />
              </div>
              <h2 className="text-3xl font-bold mb-2 tracking-tight text-white">Vault Cleared!</h2>
              <p className="text-zinc-500 text-sm mb-10">Everything ready for home.</p>

              <div className="w-full bg-[#1c1c1c] rounded-3xl p-7 mb-10 text-left">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-5">TODAY'S PICKUPS</p>
                <div className="space-y-4">
                  {state.todayList.length > 0 ? state.todayList.map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#f43f5e]" />
                      <span className="text-base font-bold text-zinc-200">{item}</span>
                    </div>
                  )) : (
                    <p className="text-zinc-600 text-xs italic">Nothing in hold yet.</p>
                  )}
                </div>
              </div>

              <button 
                onClick={resetToday}
                className="w-full py-5 bg-white text-zinc-950 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl"
              >
                <RotateCcw size={18} /> Reset Today
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <div className="fixed bottom-10 left-0 right-0 p-4 z-50 pointer-events-none flex justify-center">
        <div className="bg-[#111111] border border-white/10 rounded-full px-4 py-2 flex items-center gap-2 pointer-events-auto shadow-2xl">
          <button onClick={() => setIsSettingsOpen(true)} className="p-4 text-zinc-500 hover:text-white transition-colors">
            <Settings size={22} />
          </button>
          <button onClick={() => setIsAdding(true)} className="p-5 bg-[#f43f5e] text-white rounded-[1.5rem] shadow-lg shadow-rose-500/20 active:scale-90 transition-all">
            <Plus size={26} strokeWidth={3} />
          </button>
          <button onClick={() => setShowSummary(true)} className="p-4 text-zinc-500 hover:text-white transition-colors">
            <List size={22} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSummary && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: "100%" }} 
            className="fixed inset-0 z-[100] bg-[#09090b] p-8 pt-20"
          >
            <div className="max-w-md mx-auto h-full flex flex-col">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-4xl font-black tracking-tighter text-white">Daily Hold</h2>
                <button onClick={() => setShowSummary(false)} className="p-3 bg-white/5 rounded-2xl text-zinc-400 hover:text-white transition-all active:scale-90">
                  <X size={28} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                {state.todayList.length > 0 ? (
                  state.todayList.map((item, i) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={`${item}-${i}`} 
                      className="p-7 bg-[#111111] rounded-[2rem] flex items-center justify-between border border-white/5 shadow-xl"
                    >
                      <span className="text-xl font-bold text-white">{item}</span>
                      <CheckCircle2 size={24} className="text-emerald-500" />
                    </motion.div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center pt-24 opacity-20 text-center grayscale">
                    <Trash2 size={64} className="mb-6" />
                    <p className="font-black uppercase tracking-widest text-sm">Hold is empty</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddTaskModal isOpen={isAdding} onClose={() => setIsAdding(false)} onAdd={addTask} />
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        state={state} 
        pendingRequest={pendingPartnerRequest} 
        onAcceptRequest={() => {
          if (pendingPartnerRequest) {
            lastUpdateRef.current = Date.now();
            setState(prev => ({ ...prev, settings: { ...prev.settings, partnerEmail: pendingPartnerRequest } }));
            clearSignal(state.settings.email);
            setPendingPartnerRequest(null);
          }
        }}
        onDeclineRequest={() => { clearSignal(state.settings.email); setPendingPartnerRequest(null); }}
        onRestore={(data) => { lastUpdateRef.current = Date.now(); setState(prev => ({ ...prev, ...data })); }}
        onReset={() => { localStorage.removeItem('homebound_state'); window.location.reload(); }}
        lastSyncTime={lastSyncTime} 
        onForceSync={() => performSync(true)}
      />
    </div>
  );
};

export default App;