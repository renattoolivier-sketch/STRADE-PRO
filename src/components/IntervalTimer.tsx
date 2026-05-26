/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { IntervalSettings, IntervalState } from '../types';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Zap } from 'lucide-react';

interface IntervalTimerProps {
  settings: IntervalSettings;
  onSettingsChange: (settings: IntervalSettings) => void;
  onStateUpdate?: (state: IntervalState, timeRemaining: number) => void;
}

export default function IntervalTimer({
  settings,
  onSettingsChange,
  onStateUpdate,
}: IntervalTimerProps) {
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentCycle, setCurrentCycle] = useState<number>(1);
  const [state, setState] = useState<IntervalState>('AQUECIMENTO'); // AQUECIMENTO -> CORRIDA -> CAMINHADA -> FIM
  const [secondsLeft, setSecondsLeft] = useState<number>(15); // Aquecimento has 15s fixed
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  
  // Cache form-inputs locally
  const [localWalk, setLocalWalk] = useState<number>(settings.walkDuration);
  const [localRun, setLocalRun] = useState<number>(settings.runDuration);
  const [localCycles, setLocalCycles] = useState<number>(settings.cyclesCount);

  // Keep track of voice warnings given in the cycle to prevent duplicate triggering
  const warningFlagRef = useRef<boolean>(false);

  // Sound Synth Generator (Web Audio API)
  const playBeep = (frequency: number, duration: number) => {
    if (!audioEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.frequency.value = frequency;
      osc.type = 'sine';

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio Context failed to boot:', e);
    }
  };

  // Speak voice alarm helper
  const speakVoice = (text: string) => {
    if (!audioEnabled) return;
    try {
      if ('speechSynthesis' in window) {
        // Cancel active cue to prevent overlap latency
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.1; // slightly sped up for responsiveness
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Speech synthesis unsupported or failed:', e);
    }
  };

  // Reset the interval clock to beginning
  const resetIntervals = () => {
    setIsActive(false);
    setState('AQUECIMENTO');
    setCurrentCycle(1);
    setSecondsLeft(15);
    warningFlagRef.current = false;
  };

  // Form submit handler to commit settings changes
  const applySettings = (e: React.FormEvent) => {
    e.preventDefault();
    onSettingsChange({
      walkDuration: localWalk,
      runDuration: localRun,
      cyclesCount: localCycles,
    });
    resetIntervals();
  };

  // Transition engine between state machines
  const moveToNextState = () => {
    warningFlagRef.current = false; // Reset warning lock
    playBeep(1200, 0.6); // Loud transition double beep signal

    if (state === 'AQUECIMENTO') {
      setState('CORRIDA');
      setSecondsLeft(localRun);
      speakVoice('Corra!');
    } else if (state === 'CORRIDA') {
      setState('CAMINHADA');
      setSecondsLeft(localWalk);
      speakVoice('Caminhe e descanse.');
    } else if (state === 'CAMINHADA') {
      if (currentCycle < localCycles) {
        setCurrentCycle((prev) => prev + 1);
        setState('CORRIDA');
        setSecondsLeft(localRun);
        speakVoice('Corra de novo!');
      } else {
        setState('FIM');
        setIsActive(false);
        setSecondsLeft(0);
        speakVoice('Parabéns, treino intervalado concluído com sucesso!');
      }
    }
  };

  // State transitions when secondsLeft reaches 0
  useEffect(() => {
    if (isActive && secondsLeft === 0) {
      moveToNextState();
    }
  }, [secondsLeft, isActive, state, currentCycle, localCycles, localWalk, localRun]);

  // Timer loop execution
  useEffect(() => {
    let timer: any = null;

    if (isActive) {
      timer = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }

          const nextValue = prev - 1;

          // Crucial: Exact 5 second audio warning before state transitions!
          if (nextValue === 5 && !warningFlagRef.current) {
            warningFlagRef.current = true;
            
            // Audio beeps
            playBeep(900, 0.35);

            // Predict and state vocalize what is coming next!
            if (state === 'AQUECIMENTO') {
              speakVoice('Atenção. Comece a correr em cinco segundos!');
            } else if (state === 'CORRIDA') {
              speakVoice('Prepare-se para caminhar em cinco segundos.');
            } else if (state === 'CAMINHADA') {
              if (currentCycle >= localCycles) {
                speakVoice('Treino terminando em cinco segundos. Força total!');
              } else {
                speakVoice('Finalizando descanso. Prepare para correr em cinco segundos!');
              }
            }
          }

          // Small pulse heartbeat beeps for the last 3, 2, 1 seconds
          if (nextValue <= 3 && nextValue >= 1) {
            playBeep(650, 0.1);
          }

          return nextValue;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive, state, currentCycle, localCycles, localWalk, localRun]);

  // Sync state upward to core tracker if callback provided
  useEffect(() => {
    if (onStateUpdate) {
      onStateUpdate(state, secondsLeft);
    }
  }, [state, secondsLeft, onStateUpdate]);

  // Color mappings based on interval state for amazing styling
  const stateColor = 
    state === 'AQUECIMENTO' ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' :
    state === 'CORRIDA' ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' :
    state === 'CAMINHADA' ? 'border-teal-500/30 bg-teal-500/10 text-teal-400' :
    'border-green-500/30 bg-green-500/10 text-green-400';

  const stateLabel =
    state === 'AQUECIMENTO' ? 'Aquecendo (Prepare-se)' :
    state === 'CORRIDA' ? 'Foco: Corra Rápido! 🔥' :
    state === 'CAMINHADA' ? 'Apoio: Caminhada / Descanso 🧘' :
    'Treino Concluído! 🎉';

  // Total elapsed workout calculation
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Interval Setup Card */}
      {!isActive && state === 'AQUECIMENTO' && (
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500 animate-bounce" /> Configurar Treino
            </h3>
            
            <button
              id="btn-toggle-interval-sound"
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 transition-colors"
              title={audioEnabled ? "Silenciar áudio" : "Ativar áudio"}
            >
              {audioEnabled ? <Volume2 className="w-4 h-4 text-orange-500" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
          </div>

          <form onSubmit={applySettings} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">🏃 Corrida (Trabalho)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="input-run-duration"
                    type="number"
                    min="10"
                    max="1800"
                    value={localRun}
                    onChange={(e) => setLocalRun(Number(e.target.value))}
                    className="w-full bg-[#0A0C10] border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500 font-semibold"
                  />
                  <span className="text-[10px] text-slate-500 font-bold font-mono">seg</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-wider">🧘 Descanso (Caminhar)</label>
                <div className="flex items-center gap-1.5">
                  <input
                    id="input-walk-duration"
                    type="number"
                    min="10"
                    max="1800"
                    value={localWalk}
                    onChange={(e) => setLocalWalk(Number(e.target.value))}
                    className="w-full bg-[#0A0C10] border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-orange-500 font-semibold"
                  />
                  <span className="text-[10px] text-slate-500 font-bold font-mono">seg</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 font-bold mb-1.5 uppercase tracking-wider">🔄 Repetições / Ciclos totais</label>
              <div className="flex items-center gap-4">
                <input
                  id="input-cycles-count"
                  type="range"
                  min="2"
                  max="15"
                  value={localCycles}
                  onChange={(e) => setLocalCycles(Number(e.target.value))}
                  className="flex-1 accent-orange-600 h-1.5 bg-[#0A0C10] rounded-lg cursor-pointer border border-slate-800"
                />
                <span className="text-xs font-bold text-white font-mono whitespace-nowrap bg-slate-850 px-2.5 py-1 rounded-lg border border-slate-800">{localCycles} ciclos</span>
              </div>
            </div>

            <button
              id="submit-apply-intervals"
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl text-center text-xs font-bold text-slate-200 transition-colors cursor-pointer border border-slate-700"
            >
              Aplicar Sequência Intervalada
            </button>
          </form>
        </div>
      )}

      {/* Main Countdown Screen */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden flex flex-col justify-between min-h-[300px] hover:border-slate-700 transition-all">
        {/* State visual indicator bar */}
        <div className={`absolute top-0 left-0 right-0 h-1.5 transition-all duration-500 ${
          state === 'CORRIDA' ? 'bg-orange-500' :
          state === 'CAMINHADA' ? 'bg-teal-400' :
          state === 'AQUECIMENTO' ? 'bg-indigo-500' : 'bg-green-500'
        }`} />

        <div className="flex justify-between items-center text-xs text-slate-400">
          <span className="flex items-center gap-1 font-semibold">
            Ciclo: <strong className="text-white font-mono font-bold bg-[#0A0C10] px-2 py-0.5 rounded border border-slate-800">{currentCycle} de {localCycles}</strong>
          </span>
          <span className="font-medium text-slate-400">
            Total: <strong className="text-slate-100 font-mono bg-[#0A0C10] px-2 py-0.5 rounded border border-slate-800">{formatTime((localRun + localWalk) * localCycles + 15)}</strong>
          </span>
        </div>

        {/* Big digit countdown display */}
        <div className="my-6">
          <div className="text-6xl font-black font-mono text-white tracking-widest animate-pulse max-w-full truncate">
            {formatTime(secondsLeft)}
          </div>
          <div className={`mt-3 py-1 px-4 text-xs font-black rounded-full inline-block border transition-all ${stateColor}`}>
            {stateLabel}
          </div>
        </div>

        {/* Audio helper banner */}
        {secondsLeft <= 7 && secondsLeft > 0 && isActive && (
          <div className="p-2 bg-orange-600/10 border border-orange-500/20 text-[10px] text-orange-400 font-bold rounded-lg mx-auto py-1.5 px-3 flex items-center gap-2 animate-bounce">
            <Volume2 className="w-3.5 h-3.5" />
            <span>Alerta de Som em {secondsLeft}s!</span>
          </div>
        )}

        {/* Activity Stopwatch Actions */}
        <div className="flex gap-4 items-center justify-center pt-4 border-t border-[#0A0C10]/80">
          <button
            id="btn-reset-intervals"
            onClick={resetIntervals}
            className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full transition-colors cursor-pointer border border-slate-700"
            title="Resetar treino"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            id="btn-play-pause-intervals"
            onClick={() => {
              if (state === 'FIM') {
                resetIntervals();
                return;
              }
              setIsActive(!isActive);
              // Trigger a small boot voice cue for engagement
              if (!isActive) {
                speakVoice(state === 'AQUECIMENTO' ? 'Iniciando aquecimento. Prepare-se!' : 'Retomando treino!');
              }
            }}
            className={`p-5 rounded-full text-white transition-all transform hover:scale-105 cursor-pointer shadow-md shadow-orange-950/20 ${
              isActive 
                ? 'bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700' 
                : 'bg-orange-600 hover:bg-orange-500'
            }`}
          >
            {isActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
          </button>

          <button
            id="btn-toggle-sound-direct"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-3 rounded-full transition-colors cursor-pointer border ${
              audioEnabled ? 'bg-slate-800 hover:bg-slate-700 text-orange-400 border-slate-700' : 'bg-[#0A0C10] text-[#161B22] border-slate-800'
            }`}
            title="Sintetizador de Voz"
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
