import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendText?: string;
  colorTheme?: 'emerald' | 'amber' | 'rose' | 'teal' | 'indigo' | 'rust';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendText,
}) => {
  return (
    <div className="p-5 rounded-2xl glass-panel space-y-3 transition-all hover:scale-[1.01]">
      <div className="flex items-start justify-between">
        <div>
          <span className="label-overline text-[10px]">{title}</span>
          <div className="text-3xl font-extrabold text-[#1C1917] mt-1 font-heading">{value}</div>
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#F7DFCC] text-[#8C4A1E]">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trendText) && (
        <div className="mt-3 pt-2 border-t border-[#E8DCCE] flex items-center justify-between text-xs">
          {subtitle && <span className="text-[#786F68] text-[11px]">{subtitle}</span>}
          {trendText && (
            <span
              className={`flex items-center gap-1 font-mono font-bold text-[11px] ${
                trend === 'up'
                  ? 'text-[#D96B27]'
                  : trend === 'down'
                  ? 'text-rose-700'
                  : 'text-[#786F68]'
              }`}
            >
              {trend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
              {trend === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
              {trend === 'neutral' && <Minus className="w-3.5 h-3.5" />}
              {trendText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
