
import React from 'react';
import { motion, useMotionValue, useTransform, PanInfo, MotionValue } from 'framer-motion';
import { Task } from '../types';
import { Check, X } from 'lucide-react';

interface Props {
  task: Task;
  index: number;
  total: number;
  onSwipe: (id: string, direction: 'left' | 'right') => void;
  isTop: boolean;
  sharedX?: MotionValue<number>;
}

export const TaskCard: React.FC<Props> = ({ task, index, total, onSwipe, isTop, sharedX }) => {
  // Use independent X if not top, or sharedX if top
  const x = isTop && sharedX ? sharedX : useMotionValue(0);
  
  // Calculate stack index (0 is top, 1 is under, 2 is further under)
  const stackIndex = total - 1 - index;
  
  // Base visual transforms
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacity = useTransform(x, [-250, -180, 0, 180, 250], [0, 1, 1, 1, 0]);
  const yesOpacity = useTransform(x, [60, 160], [0, 1]);
  const noOpacity = useTransform(x, [-160, -60], [1, 0]);

  // Stack effects for underlying cards
  // As x moves away from 0, underlying cards scale UP and shift DOWN
  const dragProgress = useTransform(x, [-200, 0, 200], [1, 0, 1]);
  
  const baseScale = 1 - (stackIndex * 0.05);
  const targetScale = 1 - ((stackIndex - 1) * 0.05);
  const scale = useTransform(dragProgress, [0, 1], [baseScale, targetScale]);

  const baseY = stackIndex * -12;
  const targetY = (stackIndex - 1) * -12;
  const y = useTransform(dragProgress, [0, 1], [baseY, targetY]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 110) {
      onSwipe(task.id, 'right');
    } else if (info.offset.x < -110) {
      onSwipe(task.id, 'left');
    } else {
      x.set(0);
    }
  };

  return (
    <motion.div
      style={{ 
        x, 
        y: isTop ? 0 : y,
        rotate: isTop ? rotate : 0, 
        scale: isTop ? 1 : scale,
        opacity, 
        zIndex: 50 - stackIndex 
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      className={`absolute w-full aspect-[3/4] rounded-[3rem] p-8 flex flex-col justify-between shadow-2xl cursor-grab active:cursor-grabbing select-none border-4 border-white/10 ${task.color}`}
    >
      <div className="flex justify-between items-start">
        <div className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-sm">
          {task.frequency.replace('_', ' ')}
        </div>
      </div>

      <div className="flex flex-col items-center text-center">
        <motion.h2 
          animate={{ scale: isTop ? 1 : 0.95 }}
          className="text-4xl font-black text-white leading-tight mb-4 drop-shadow-lg tracking-tighter"
        >
          {task.name}
        </motion.h2>
        <p className="text-white/70 text-xs font-black uppercase tracking-widest">
          Bring this home?
        </p>
      </div>

      <div className="flex justify-between items-center w-full px-2">
        <motion.div 
          style={{ opacity: noOpacity, scale: noOpacity }} 
          className="bg-white/20 p-4 rounded-3xl backdrop-blur-md"
        >
          <X className="text-white" size={36} strokeWidth={3} />
        </motion.div>
        <motion.div 
          style={{ opacity: yesOpacity, scale: yesOpacity }} 
          className="bg-white/20 p-4 rounded-3xl backdrop-blur-md"
        >
          <Check className="text-white" size={36} strokeWidth={3} />
        </motion.div>
      </div>
    </motion.div>
  );
};
