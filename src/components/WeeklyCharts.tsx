/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Activity, SportType } from '../types';
import { BarChart2, Award, Flame, Zap } from 'lucide-react';

interface WeeklyChartsProps {
  activities: Activity[];
  weeklyRunGoal: number;
  weeklyBikeGoal: number;
}

export default function WeeklyCharts({ activities, weeklyRunGoal, weeklyBikeGoal }: WeeklyChartsProps) {
  const [sportFilter, setSportFilter] = useState<SportType | 'TODOS'>('TODOS');

  // Days of the week in Portuguese
  const dayNames = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  // Helper to map date to day index (0 = Seg, 6 = Dom)
  const getDayIndex = (dateStr: string): number => {
    const date = new Date(dateStr + 'T00:00:00');
    let day = date.getDay(); // 0 is Sunday, 1 is Monday...
    return day === 0 ? 6 : day - 1; // map so Monday is 0, Sunday is 6
  };

  // Filter activities to the current week
  const filteredActivities = activities.filter(act => {
    if (sportFilter === 'TODOS') return true;
    return act.type === sportFilter;
  });

  const dailyDistance = Array(7).fill(0);
  const dailyCalories = Array(7).fill(0);

  filteredActivities.forEach(act => {
    const dayIdx = getDayIndex(act.date);
    if (dayIdx >= 0 && dayIdx < 7) {
      dailyDistance[dayIdx] += act.distance;
      dailyCalories[dayIdx] += act.calories;
    }
  });

  const totalDistance = dailyDistance.reduce((acc, curr) => acc + curr, 0);
  const totalCalories = dailyCalories.reduce((acc, curr) => acc + curr, 0);

  // Determine current goal progress based on filter
  const currentDistanceGoal = 
    sportFilter === 'CORRIDA' ? weeklyRunGoal : 
    sportFilter === 'CICLISMO' ? weeklyBikeGoal : 
    (weeklyRunGoal + weeklyBikeGoal);

  const goalProgressPercent = Math.min(Math.round((totalDistance / currentDistanceGoal) * 100), 100);

  // SVG configuration
  const chartHeight = 120;
  const maxDistance = Math.max(...dailyDistance, 5); // Fallback limit to prevent divide by zero
  const maxCalories = Math.max(...dailyCalories, 200);

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Sport Selector Pills */}
      <div className="flex gap-2 p-1 bg-[#161B22] border border-slate-800 rounded-xl">
        {(['TODOS', 'CORRIDA', 'CICLISMO'] as const).map(mode => (
          <button
            key={mode}
            id={`btn-chart-filter-${mode.toLowerCase()}`}
            onClick={() => setSportFilter(mode)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
              sportFilter === mode
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-950/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {mode === 'TODOS' ? 'Geral' : mode === 'CORRIDA' ? 'Corrida 🏃' : 'Bike 🚴'}
          </button>
        ))}
      </div>

      {/* Overview Bento Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Card 1 */}
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2">
            <Zap className="w-4 h-4 text-orange-500" />
            <span>Distância Total</span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight font-mono">
            {totalDistance.toFixed(1)} <span className="text-xs font-bold text-slate-400">km</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between">
            <span>Meta: {currentDistanceGoal} km</span>
            <span className="text-orange-500 font-bold font-mono">{goalProgressPercent}%</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold mb-2">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Gasto Calórico</span>
          </div>
          <div className="text-2xl font-black text-white tracking-tight font-mono">
            {totalCalories.toLocaleString()} <span className="text-xs font-bold text-slate-400">kcal</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1.5 font-mono">
            Média: {(totalCalories / 7).toFixed(0)} kcal/dia
          </div>
        </div>
      </div>

      {/* Goal Progress Ring */}
      <div className="bg-[#161B22] border border-slate-800 p-4 rounded-2xl shadow-sm hover:border-slate-700 transition-all">
        <div className="flex justify-between items-center mb-3">
          <span className="text-slate-200 text-xs font-bold flex items-center gap-1.5">
            <Award className="w-4 h-4 text-orange-500 animate-pulse" /> Meta Semanal
          </span>
          <span className="text-xs text-orange-500 font-mono font-black">{goalProgressPercent}%</span>
        </div>
        <div className="w-full bg-[#0A0C10] border border-slate-800/80 rounded-full h-3.5 overflow-hidden p-0.5">
          <div 
            className="bg-gradient-to-r from-orange-600 to-amber-500 h-2 rounded-full transition-all duration-1000 ease-out shadow-lg" 
            style={{ width: `${goalProgressPercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2.5 font-mono">
          <span>{totalDistance.toFixed(1)} km percorridos</span>
          <span>Meta: {currentDistanceGoal} km</span>
        </div>
      </div>

      {/* Custom SVG Distance Chart */}
      <div className="bg-[#161B22] border border-slate-800 p-4 rounded-2xl shadow-sm hover:border-slate-700 transition-all">
        <h4 className="text-xs text-slate-200 font-bold flex items-center gap-1.5 mb-4">
          <BarChart2 className="w-4 h-4 text-orange-500" /> Distância por Dia (km)
        </h4>

        <div className="flex justify-between items-end h-[140px] px-2 relative pt-2">
          {/* Chart Helper Gridlines */}
          <div className="absolute left-0 right-0 border-t border-slate-800/40 top-[10px] pointer-events-none" />
          <div className="absolute left-0 right-0 border-t border-slate-800/40 top-[60px] pointer-events-none" />
          <div className="absolute left-0 right-0 border-b border-slate-800/60 bottom-[24px] pointer-events-none" />

          {dailyDistance.map((dist, idx) => {
            // Calculate height percent
            const barHeightPct = (dist / maxDistance) * chartHeight;
            const finalHeight = Math.max(barHeightPct, dist > 0 ? 8 : 1); // minimum height if value exists

            return (
              <div key={idx} className="flex flex-col items-center flex-1 z-10 group cursor-pointer relative">
                {/* Tooltip on hover */}
                {dist > 0 && (
                  <div className="absolute bottom-[115px] bg-[#0A0C10] text-white text-[10px] py-1 px-1.5 rounded border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-xl font-mono">
                    {dist.toFixed(1)} km
                  </div>
                )}
                
                {/* Value Label */}
                <span className={`text-[10px] font-mono mb-1.5 transition-all duration-300 ${dist > 0 ? 'text-orange-400 font-bold' : 'text-slate-600'}`}>
                  {dist > 0 ? dist.toFixed(1) : '-'}
                </span>

                {/* Bar */}
                <div 
                  className={`w-3.5 sm:w-5 rounded-t-md transition-all duration-500 origin-bottom ${
                    dist > 0 
                      ? 'bg-gradient-to-t from-orange-600 to-amber-500 group-hover:from-orange-500 group-hover:to-orange-400 shadow-md shadow-orange-950/20' 
                      : 'bg-slate-800/60'
                  }`}
                  style={{ height: `${finalHeight}px` }}
                />

                {/* Day Name */}
                <span className="text-[10px] text-slate-400 font-semibold mt-2">{dayNames[idx]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom SVG Calories Chart */}
      <div className="bg-[#161B22] border border-slate-800 p-4 rounded-2xl shadow-sm hover:border-slate-700 transition-all">
        <h4 className="text-xs text-slate-200 font-bold flex items-center gap-1.5 mb-4">
          <Flame className="w-4 h-4 text-orange-500" /> Calorias Gastas (kcal)
        </h4>

        <div className="flex justify-between items-end h-[140px] px-2 relative pt-2">
          {/* Chart Helper Gridlines */}
          <div className="absolute left-0 right-0 border-t border-slate-800/40 top-[10px] pointer-events-none" />
          <div className="absolute left-0 right-0 border-t border-slate-800/40 top-[60px] pointer-events-none" />
          <div className="absolute left-0 right-0 border-b border-slate-800/60 bottom-[24px] pointer-events-none" />

          {dailyCalories.map((cals, idx) => {
            const barHeightPct = (cals / maxCalories) * chartHeight;
            const finalHeight = Math.max(barHeightPct, cals > 0 ? 8 : 1);

            return (
              <div key={idx} className="flex flex-col items-center flex-1 z-10 group cursor-pointer relative">
                {/* Tooltip on hover */}
                {cals > 0 && (
                  <div className="absolute bottom-[115px] bg-[#0A0C10] text-white text-[10px] py-1 px-1.5 rounded border border-slate-700 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150 shadow-xl font-mono">
                    {cals} kcal
                  </div>
                )}
                
                {/* Value Label */}
                <span className={`text-[10px] font-mono mb-1.5 transition-all duration-300 ${cals > 0 ? 'text-amber-400 font-bold' : 'text-slate-600'}`}>
                  {cals > 0 ? cals : '-'}
                </span>

                {/* Bar */}
                <div 
                  className={`w-3.5 sm:w-5 rounded-t-md transition-all duration-500 origin-bottom ${
                    cals > 0 
                      ? 'bg-gradient-to-t from-orange-500 to-amber-500 group-hover:from-orange-400 group-hover:to-amber-400 shadow-md shadow-orange-950/20' 
                      : 'bg-slate-800/60'
                  }`}
                  style={{ height: `${finalHeight}px` }}
                />

                {/* Day Name */}
                <span className="text-[10px] text-slate-400 font-semibold mt-2">{dayNames[idx]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
