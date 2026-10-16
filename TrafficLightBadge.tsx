import React from 'react';
import { TrafficLight } from '../types';
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react';

interface Props {
  status: TrafficLight;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TrafficLightBadge: React.FC<Props> = ({ status, size = 'md', showLabel = true }) => {
  const configs: Record<TrafficLight, {
    bg: string;
    dot: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    colorName: string;
  }> = {
    green: {
      bg: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700/60',
      dot: 'bg-emerald-500 shadow-emerald-500/50 shadow-sm',
      label: 'Seguro / Apto',
      icon: ShieldCheck,
      colorName: 'Verde Lubo',
    },
    yellow: {
      bg: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700/60',
      dot: 'bg-amber-500 shadow-amber-500/50 shadow-sm',
      label: 'Precaución',
      icon: AlertTriangle,
      colorName: 'Amarillo Lubo',
    },
    red: {
      bg: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-700/60',
      dot: 'bg-rose-500 shadow-rose-500/50 shadow-sm animate-pulse',
      label: 'Evitar / Tóxico',
      icon: AlertOctagon,
      colorName: 'Rojo Lubo',
    },
  };

  const conf = configs[status] || configs.yellow;
  const Icon = conf.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs md:text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-sm md:text-base px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border transition-all ${conf.bg} ${sizeClasses[size]}`}
    >
      <span className={`w-2 h-2 rounded-full ${conf.dot}`} />
      <Icon className="w-3.5 h-3.5" />
      {showLabel && <span>{conf.label}</span>}
    </span>
  );
};
