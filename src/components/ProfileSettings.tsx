/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserProfile, Achievement } from '../types';
import { User, Scale, Ruler, Award, CheckCircle, Target } from 'lucide-react';

interface ProfileSettingsProps {
  profile: UserProfile;
  onSaveProfile: (profile: UserProfile) => void;
  achievements: Achievement[];
}

export default function ProfileSettings({ profile, onSaveProfile, achievements }: ProfileSettingsProps) {
  const [weight, setWeight] = useState<number>(profile.weight);
  const [height, setHeight] = useState<number>(profile.height);
  const [age, setAge] = useState<number>(profile.age);
  const [gender, setGender] = useState<'M' | 'F' | 'OUTRO'>(profile.gender);
  const [weeklyGoalRun, setWeeklyGoalRun] = useState<number>(profile.weeklyDistanceGoalRun);
  const [weeklyGoalBike, setWeeklyGoalBike] = useState<number>(profile.weeklyDistanceGoalBike);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      weight,
      height,
      age,
      gender,
      weeklyDistanceGoalRun: weeklyGoalRun,
      weeklyDistanceGoalBike: weeklyGoalBike,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Profile calculations
  const heightInMeters = height / 100;
  const imc = heightInMeters > 0 ? (weight / (heightInMeters * heightInMeters)).toFixed(1) : '0';
  let imcStatus = 'Normal';
  let imcColor = 'text-green-400 bg-green-500/10 border-green-500/30';

  const numericImc = Number(imc);
  if (numericImc < 18.5) {
    imcStatus = 'Abaixo do peso';
    imcColor = 'text-blue-400 bg-blue-500/10 border-blue-500/30';
  } else if (numericImc >= 25 && numericImc < 30) {
    imcStatus = 'Sobrepeso';
    imcColor = 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
  } else if (numericImc >= 30) {
    imcStatus = 'Obesidade';
    imcColor = 'text-red-400 bg-red-500/10 border-red-500/30';
  }

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Bio Information Form */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-orange-500" /> Biotipo e Metas de Treino
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5 inline mr-1 text-slate-500" /> Peso (kg)
              </label>
              <input
                id="input-weight"
                type="number"
                value={weight}
                onChange={(e) => setWeight(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#0A0C10] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">
                <Ruler className="w-3.5 h-3.5 inline mr-1 text-slate-500" /> Altura (cm)
              </label>
              <input
                id="input-height"
                type="number"
                value={height}
                onChange={(e) => setHeight(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#0A0C10] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">
                Idade (anos)
              </label>
              <input
                id="input-age"
                type="number"
                value={age}
                onChange={(e) => setAge(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#0A0C10] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">
                Gênero
              </label>
              <select
                id="select-gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-[#0A0C10] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-semibold"
              >
                <option value="M" className="bg-[#161B22]">Masculino</option>
                <option value="F" className="bg-[#161B22]">Feminino</option>
                <option value="OUTRO" className="bg-[#161B22]">Outro</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80">
            <h4 className="text-xs text-slate-300 font-bold mb-3 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-orange-500" /> Metas de Distância Semanal (km)
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1">🏃 Corrida</label>
                <input
                  id="goal-run"
                  type="number"
                  value={weeklyGoalRun}
                  onChange={(e) => setWeeklyGoalRun(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#0A0C10] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 font-bold mb-1">🚴 Ciclismo</label>
                <input
                  id="goal-bike"
                  type="number"
                  value={weeklyGoalBike}
                  onChange={(e) => setWeeklyGoalBike(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-[#0A0C10] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono font-semibold"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="btn-save-profile"
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-500 font-bold py-2.5 px-4 rounded-xl text-xs text-white transition-all cursor-pointer shadow-lg shadow-orange-950/20 flex items-center justify-center gap-2"
            >
              Salvar Biotipo e Metas
            </button>
            {saveSuccess && (
              <div id="toast-save-profile" className="mt-2 text-center text-xs text-green-400 font-bold animate-pulse">
                ✓ Atualizado com sucesso!
              </div>
            )}
          </div>
        </form>
      </div>

      {/* IMC Display Badge */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:border-slate-700 transition-all">
        <div>
          <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Seu Índice de Massa Corporal (IMC)</span>
          <span className="text-2xl font-black text-white font-mono">{imc}</span>
          <span className="text-xs text-slate-400 font-semibold ml-1">kg/m²</span>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="block text-[9px] text-slate-500 font-bold uppercase mb-1">Status Metabólico</span>
          <span className={`text-xs font-black font-mono leading-none border rounded-full px-3 py-1 flex items-center justify-center ${imcColor}`}>{imcStatus}</span>
        </div>
      </div>

      {/* Target Achievements */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
          <Award className="w-5 h-5 text-orange-500" /> Sala de Troféus e Conquistas
        </h3>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Desafie-se completando metas pré-definidas! O app detecta e emite uma notificação quando um marco é alcançado.
        </p>

        <div className="grid grid-cols-2 gap-3">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                ach.unlocked
                  ? 'bg-gradient-to-br from-orange-600/10 to-transparent border-orange-500/30 shadow-sm'
                  : 'bg-[#0A0C10]/40 border-slate-800/80 opacity-55'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-2xl">{ach.icon}</span>
                {ach.unlocked && (
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                )}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100 leading-tight">{ach.title}</h4>
                <p className="text-[10px] text-slate-400 leading-normal mt-0.5 description">{ach.description}</p>
                {ach.unlocked && ach.dateUnlocked && (
                  <span className="block text-[8px] text-orange-400 font-bold font-mono mt-2 flex items-center gap-1.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block"></span>
                    {ach.dateUnlocked}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
