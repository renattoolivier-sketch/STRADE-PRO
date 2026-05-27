/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  History, 
  Bluetooth, 
  User, 
  Play, 
  Square, 
  RotateCcw, 
  Award, 
  MapPin, 
  Bike, 
  Flame, 
  Activity as HeartIcon, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  Smartphone, 
  Tablet,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  ChevronRight,
  Info
} from 'lucide-react';

import { SportType, Activity, UserProfile, IntervalSettings, IntervalState, Achievement, Coordinate } from './types';
import { ROUTE_TEMPLATES, INITIAL_ACTIVITIES, INITIAL_ACHIEVEMENTS } from './data';
import WeeklyCharts from './components/WeeklyCharts';
import BluetoothHR from './components/BluetoothHR';
import ProfileSettings from './components/ProfileSettings';
import IntervalTimer from './components/IntervalTimer';
import TrajectorySVG from './components/TrajectorySVG';

export default function App() {
  // Core App states
  const [tab, setTab] = useState<'RECORD' | 'HISTORY' | 'BLUETOOTH' | 'PROFILE'>('RECORD');
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile>({
    weight: 74,
    height: 176,
    age: 28,
    gender: 'M',
    weeklyDistanceGoalRun: 15,
    weeklyDistanceGoalBike: 45,
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    const saved = localStorage.getItem('strava_activities');
    return saved ? JSON.parse(saved) : INITIAL_ACTIVITIES;
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem('strava_achievements');
    return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
  });

  // Target Goal notifications
  const [activeAchievementUnlocked, setActiveAchievementUnlocked] = useState<string | null>(null);

  // Active workout tracking states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [sportType, setSportType] = useState<SportType>('CORRIDA');
  
  // Custom Interval Workout toggles
  const [workoutMode, setWorkoutMode] = useState<'FREE' | 'INTERVAL'>('FREE');
  const [intervalSettings, setIntervalSettings] = useState<IntervalSettings>({
    walkDuration: 60, // seconds
    runDuration: 120, // seconds
    cyclesCount: 5,
  });
  const [currentIntervalState, setCurrentIntervalState] = useState<IntervalState>('AQUECIMENTO');
  const [currentIntervalTimeRemaining, setCurrentIntervalTimeRemaining] = useState<number>(0);

  // Telemetry real-time values
  const [timeElapsed, setTimeElapsed] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [currentBpm, setCurrentBpm] = useState<number>(75);
  const [avgBpmList, setAvgBpmList] = useState<number[]>([]);
  const [isSensorConnected, setIsSensorConnected] = useState<boolean>(false);
  
  // Route details & real Geolocation markers
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeRoutePath, setActiveRoutePath] = useState<Coordinate[]>([]);
  const [selectedRouteTemplateId, setSelectedRouteTemplateId] = useState<string>('copacabana-beach');
  const [currentTemplateStep, setCurrentTemplateStep] = useState<number>(0);
  const [gpsStatus, setGpsStatus] = useState<'BUSCANDO' | 'CONECTADO' | 'SEM_SINAL' | 'NAO_SUPORTADO'>('BUSCANDO');

  // Geolocation tracking state persistence references
  const watchIdRef = useRef<number | null>(null);
  const lastCoordinateRef = useRef<Coordinate | null>(null);

  // Stopwatch background timing references
  const stopwatchStartTimeRef = useRef<number | null>(null);
  const stopwatchAccumulatedSecondsRef = useRef<number>(0);

  // Screen Wake Lock API reference to prevent screen turn-off on mobile
  const wakeLockRef = useRef<any>(null);

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem('strava_activities', JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem('strava_achievements', JSON.stringify(achievements));
  }, [achievements]);

  // Haversine distance formula in kilometers
  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Live Geolocation Tracking Engine
  useEffect(() => {
    if (isRecording && !isPaused) {
      if (isSimulating) {
        setGpsStatus('CONECTADO');
        return;
      }
      if (navigator.geolocation) {
        setGpsStatus('BUSCANDO');
        
        // Fetch starting coordinate immediately to initialize route
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const startCoord = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setActiveRoutePath([startCoord]);
            lastCoordinateRef.current = startCoord;
            setGpsStatus('CONECTADO');
          },
          (error) => {
            console.warn("Erro ao obter posição inicial do GPS:", error);
            setGpsStatus('SEM_SINAL');
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );

        // Subscribing to continuous position updates
        const id = navigator.geolocation.watchPosition(
          (position) => {
            const newCoord = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setGpsStatus('CONECTADO');

            setActiveRoutePath((prev) => {
              if (prev.length === 0) {
                lastCoordinateRef.current = newCoord;
                return [newCoord];
              }

              const prevCoord = lastCoordinateRef.current || prev[prev.length - 1];
              const diffKm = calculateHaversineDistance(
                prevCoord.lat,
                prevCoord.lng,
                newCoord.lat,
                newCoord.lng
              );

              // Filter out minor GPS noise/jitter (under 2 meters)
              if (diffKm > 0.002) {
                setDistance(prevDist => Number((prevDist + diffKm).toFixed(3)));
                lastCoordinateRef.current = newCoord;
                return [...prev, newCoord];
              }

              return prev;
            });
          },
          (error) => {
            console.warn("Erro no watchPosition:", error);
            setGpsStatus('SEM_SINAL');
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
        );

        watchIdRef.current = id;
      } else {
        setGpsStatus('NAO_SUPORTADO');
      }
    } else {
      // Clear GPS subscriber when paused or finished
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [isRecording, isPaused, isSimulating]);

  // Simulation tracking engine - Generates coordinates over time when testing indoors
  useEffect(() => {
    let simTicker: any = null;
    if (isRecording && !isPaused && isSimulating) {
      const template = ROUTE_TEMPLATES.find(r => r.id === selectedRouteTemplateId);
      if (template && template.coordinates.length > 0) {
        // Initialize start position if empty
        if (activeRoutePath.length === 0) {
          const firstCoord = template.coordinates[0];
          setActiveRoutePath([firstCoord]);
          lastCoordinateRef.current = firstCoord;
        }

        simTicker = setInterval(() => {
          setActiveRoutePath((prev) => {
            if (prev.length === 0) {
              const firstCoord = template.coordinates[0];
              lastCoordinateRef.current = firstCoord;
              return [firstCoord];
            }

            const nextIndex = prev.length;
            if (nextIndex >= template.coordinates.length) {
              clearInterval(simTicker);
              return prev;
            }

            const nextCoord = template.coordinates[nextIndex];
            const prevCoord = lastCoordinateRef.current || prev[prev.length - 1];
            const diffKm = calculateHaversineDistance(
              prevCoord.lat,
              prevCoord.lng,
              nextCoord.lat,
              nextCoord.lng
            );

            setDistance(prevDist => Number((prevDist + diffKm).toFixed(3)));
            lastCoordinateRef.current = nextCoord;
            return [...prev, nextCoord];
          });
        }, 3000); // Progress to the next coordinate point every 3 seconds
      }
    }

    return () => {
      if (simTicker) clearInterval(simTicker);
    };
  }, [isRecording, isPaused, isSimulating, selectedRouteTemplateId]);

  // Live Stopwatch Ticker with robust system timestamp background calibration
  useEffect(() => {
    let ticker: any = null;

    if (isRecording && !isPaused) {
      if (stopwatchStartTimeRef.current === null) {
        stopwatchStartTimeRef.current = Date.now();
      }

      let lastSecondPushed = Math.floor(stopwatchAccumulatedSecondsRef.current);

      ticker = setInterval(() => {
        if (stopwatchStartTimeRef.current !== null) {
          const elapsedSecs = (Date.now() - stopwatchStartTimeRef.current) / 1000;
          const currentTotal = stopwatchAccumulatedSecondsRef.current + elapsedSecs;
          const currentTotalInt = Math.floor(currentTotal);
          
          setTimeElapsed(currentTotalInt);

          // Log heartbeat lists corresponding to each fresh second elapsed
          if (currentTotalInt > lastSecondPushed) {
            const secondsPassed = currentTotalInt - lastSecondPushed;
            setAvgBpmList(bList => {
              const newList = [...bList];
              for (let i = 0; i < secondsPassed; i++) {
                newList.push(currentBpm);
              }
              return newList;
            });
            lastSecondPushed = currentTotalInt;
          }
        }
      }, 250); // High sampling rate maintains UI updates during active tab returns
    } else {
      // Save current segment duration on stop or pause
      if (stopwatchStartTimeRef.current !== null) {
        stopwatchAccumulatedSecondsRef.current += (Date.now() - stopwatchStartTimeRef.current) / 1000;
        stopwatchStartTimeRef.current = null;
      }
    }

    return () => {
      if (ticker) clearInterval(ticker);
    };
  }, [isRecording, isPaused, currentBpm]);

  // Wake lock to keep celular screen active during recording
  useEffect(() => {
    const requestWakeLock = async () => {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          console.log('STRIDE PRO: Wake Lock ativado com sucesso.');
        } catch (err) {
          console.warn('Erro ao solicitar Wake Lock (Prevenção de Tela de Bloqueio):', err);
        }
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log('STRIDE PRO: Wake Lock desativado.');
        } catch (err) {}
      }
    };

    if (isRecording && !isPaused) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [isRecording, isPaused]);

  // Start Workout Tracking
  const handleStartWorkout = () => {
    stopwatchStartTimeRef.current = Date.now();
    stopwatchAccumulatedSecondsRef.current = 0;

    setTimeElapsed(0);
    setDistance(0);
    setAvgBpmList([]);
    setCurrentTemplateStep(0);
    setActiveRoutePath([]);
    lastCoordinateRef.current = null;

    setIsRecording(true);
    setIsPaused(false);
  };

  // Double beep dynamic audio signals for saving
  const playSaveBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch(e){}
  };

  // Calculate calories dynamically based on biomechanic parameters
  // Equation uses Weight (profile), Sport MET coefficients, Heart Rate telemetry, and Duration
  const calculateCaloriesBurned = (): number => {
    let met = sportType === 'CORRIDA' ? 9.8 : 7.5;
    
    // Scale intensity multipliers based on active heartbeats
    if (currentBpm > 150) {
      met *= 1.35; // Anerobic sprint tier
    } else if (currentBpm < 100) {
      met *= 0.65; // Low-intensity recovery
    }

    const durationInHours = timeElapsed / 3600;
    return Math.round(met * profile.weight * durationInHours);
  };

  const calculatedCalories = calculateCaloriesBurned();

  // Save Exercise Activity
  const handleSaveWorkout = () => {
    if (timeElapsed < 5) {
      // workout too short error
      alert("Aviso: Atividade muito curta para ser registrada! Registre por pelo menos 5 segundos.");
      return;
    }

    const calculatedAvgBpm = avgBpmList.length > 0 
      ? Math.round(avgBpmList.reduce((a, b) => a + b, 0) / avgBpmList.length)
      : undefined;

    const calculatedMaxBpm = avgBpmList.length > 0
      ? Math.max(...avgBpmList)
      : undefined;

    const formatPace = (): string => {
      if (distance === 0) return '-';
      if (sportType === 'CORRIDA') {
        const totalMinutes = timeElapsed / 60;
        const paceDec = totalMinutes / distance;
        const mins = Math.floor(paceDec);
        const secs = Math.round((paceDec - mins) * 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} min/km`;
      } else {
        const hours = timeElapsed / 3600;
        const speed = distance / hours;
        return `${speed.toFixed(1)} km/h`;
      }
    };

    const newActivity: Activity = {
      id: `act-${Date.now()}`,
      type: sportType,
      title: sportType === 'CORRIDA' ? 'Corrida Estilo Strava' : 'Pedal Estilo Strava',
      date: new Date().toISOString().split('T')[0],
      duration: timeElapsed,
      distance: Number(distance.toFixed(2)),
      avgPace: formatPace(),
      calories: calculatedCalories,
      avgHeartRate: calculatedAvgBpm,
      maxHeartRate: calculatedMaxBpm,
      coordinates: activeRoutePath
    };

    const updatedActivities = [newActivity, ...activities];
    setActivities(updatedActivities);
    playSaveBeep();

    // Check targets unlock levels
    checkUnlockingAchievements(newActivity, updatedActivities);

    // Reset recording parameters
    setIsRecording(false);
    setIsPaused(false);
    setTimeElapsed(0);
    setDistance(0);
    setActiveRoutePath([]);
    setTab('HISTORY');
  };

  // Delete an activity
  const handleDeleteActivity = (id: string) => {
    if (confirm("Tens a certeza que desejas apagar esta atividade do teu histórico?")) {
      setActivities(prev => prev.filter(act => act.id !== id));
    }
  };

  // Evaluate and notify achievement triggers
  const checkUnlockingAchievements = (newAct: Activity, allActs: Activity[]) => {
    const updatedAchievements = achievements.map(ach => {
      if (ach.unlocked) return ach;

      let triggered = false;

      if (ach.type === 'DISTANCE' && (ach.sport === 'TODOS' || ach.sport === newAct.type)) {
        if (newAct.distance >= ach.threshold) {
          triggered = true;
        }
      } else if (ach.type === 'CALORIES') {
        if (newAct.calories >= ach.threshold) {
          triggered = true;
        }
      } else if (ach.type === 'COUNT' && (ach.sport === 'TODOS' || ach.sport === newAct.type)) {
        const count = allActs.filter(a => ach.sport === 'TODOS' || a.type === ach.sport).length;
        if (count >= ach.threshold) {
          triggered = true;
        }
      }

      if (triggered) {
        setActiveAchievementUnlocked(ach.title + ' ' + ach.icon);
        // Play congratulations voice cue
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
            window.speechSynthesis.cancel();
            
            setTimeout(() => {
              try {
                const utterance = new SpeechSynthesisUtterance(`Parabéns! Você alcançou a meta: ${ach.title}! ${ach.description}`);
                utterance.lang = 'pt-BR';
                utterance.rate = 1.35; // Increased voice rate per user request (1.35)
                
                const voices = window.speechSynthesis.getVoices();
                const ptVoice = voices.find(v => v.lang.toLowerCase() === 'pt-br') || 
                                voices.find(v => v.lang.toLowerCase().includes('pt'));
                if (ptVoice) {
                  utterance.voice = ptVoice;
                }
                
                window.speechSynthesis.speak(utterance);
              } catch (err) {}
            }, 50);
          } catch(e){}
        }

        return {
          ...ach,
          unlocked: true,
          dateUnlocked: new Date().toISOString().split('T')[0]
        };
      }

      return ach;
    });

    setAchievements(updatedAchievements);
  };

  // Convert tracked duration format (hh:mm:ss)
  const formatTimeSpan = (sec: number): string => {
    const hh = Math.floor(sec / 3600);
    const mm = Math.floor((sec % 3600) / 60);
    const ss = sec % 60;
    
    return [
      hh > 0 ? hh.toString().padStart(2, '0') : null,
      mm.toString().padStart(2, '0'),
      ss.toString().padStart(2, '0')
    ].filter(Boolean).join(':');
  };

  // Total athletic cumulative statistics
  const totalKmRun = activities.filter(a => a.type === 'CORRIDA').reduce((sum, current) => sum + current.distance, 0);
  const totalKmBike = activities.filter(a => a.type === 'CICLISMO').reduce((sum, current) => sum + current.distance, 0);
  const aggregateCalories = activities.reduce((sum, current) => sum + current.calories, 0);

  // Render simulator content based on active tab
  const renderRecordTab = () => {
    return (
      <div className="space-y-5">
            {/* Sport toggle slider */}
            {!isRecording ? (
              <div className="space-y-3">
                <div className="flex gap-2 p-1 bg-[#161B22] border border-slate-800 rounded-xl">
                  <button
                    id="btn-sport-running"
                    onClick={() => {
                      setSportType('CORRIDA');
                      setSelectedRouteTemplateId('copacabana-beach');
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      sportType === 'CORRIDA'
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-950/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🏃 Corrida
                  </button>
                  <button
                    id="btn-sport-cycling"
                    onClick={() => {
                      setSportType('CICLISMO');
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      sportType === 'CICLISMO'
                        ? 'bg-orange-600 text-white shadow-lg shadow-orange-950/20'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🚴 Ciclismo
                  </button>
                </div>

                {/* Geolocation Input Mode Toggles */}
                <div className="bg-[#161B22] border border-slate-800 p-4 rounded-2xl space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                      <MapPin className="w-4 h-4 text-orange-500" />
                      Captura de Trajeto
                    </span>
                    <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono font-bold">
                      {isSimulating ? 'SIMULADO' : 'GPS ATIVO'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-[#0A0C10] p-1 rounded-xl border border-slate-850">
                    <button
                      id="opt-gps-real"
                      type="button"
                      onClick={() => setIsSimulating(false)}
                      className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        !isSimulating 
                          ? 'bg-orange-600 text-white shadow-lg' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      📡 GPS Real 
                    </button>
                    <button
                      id="opt-gps-sim"
                      type="button"
                      onClick={() => {
                        setIsSimulating(true);
                        // Default to sport-appropriate route templates
                        if (sportType === 'CORRIDA') {
                          setSelectedRouteTemplateId('copacabana-beach');
                        } else {
                          setSelectedRouteTemplateId('lagoa-rodrigo-freitas');
                        }
                      }}
                      className={`py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                        isSimulating 
                          ? 'bg-orange-600 text-white shadow-lg' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      🧪 Simular (Testar em Casa)
                    </button>
                  </div>

                  {/* Template selector if simulating */}
                  {isSimulating && (
                    <div className="space-y-1.5 pt-1">
                      <label className="block text-[9px] text-slate-400 font-bold uppercase">Escolher Trajeto para Simulação:</label>
                      <select
                        id="select-simulation-route"
                        value={selectedRouteTemplateId}
                        onChange={(e) => setSelectedRouteTemplateId(e.target.value)}
                        className="w-full bg-[#0A0C10] border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-orange-500 cursor-pointer"
                      >
                        {ROUTE_TEMPLATES.filter(r => r.type === sportType).map((route) => (
                          <option key={route.id} value={route.id}>
                            {route.name} ({route.distance}km)
                          </option>
                        ))}
                      </select>
                      <p className="text-[9px] text-slate-500 leading-normal">
                        Modo Simulador: Conforme o cronômetro avança, o aplicativo gerará novos pontos ao longo da orla desejada para desenhar o trajeto live!
                      </p>
                    </div>
                  )}
                </div>

                {/* Workout category selection */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="btn-workoutmode-free"
                    onClick={() => setWorkoutMode('FREE')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      workoutMode === 'FREE'
                        ? 'bg-orange-600/10 border-orange-500 text-orange-400'
                        : 'bg-[#161B22] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="block text-xs font-bold">Livre</span>
                    <span className="block text-[9px] text-slate-400 mt-1 leading-normal">Gere percursos livres e cronometre tempo total.</span>
                  </button>

                  <button
                    id="btn-workoutmode-interval"
                    onClick={() => setWorkoutMode('INTERVAL')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      workoutMode === 'INTERVAL'
                        ? 'bg-orange-600/10 border-orange-500 text-orange-400'
                        : 'bg-[#161B22] border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="block text-xs font-bold">Treino Intervalado</span>
                    <span className="block text-[9px] text-slate-400 mt-1 leading-normal">Sequência de caminhada + corrida com alertas de som.</span>
                  </button>
                </div>

                {/* Quick Start Launcher */}
                <button
                  id="btn-trigger-start-workout"
                  onClick={handleStartWorkout}
                  className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-orange-400 text-white font-black py-4 px-6 rounded-2xl text-sm tracking-wide shadow-lg cursor-pointer transform hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>INICIAR {sportType === 'CORRIDA' ? 'CORRIDA' : 'ATLETISMO PEDAL'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Active real cellphone GPS status indicator */}
                <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-3 flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5 font-sans">
                    <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    Sinal de Satélite
                  </span>
                  <span className={`text-[10px] border px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 uppercase font-mono ${
                    gpsStatus === 'CONECTADO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    gpsStatus === 'BUSCANDO' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-red-500/10 text-red-500 border-red-500/20'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      gpsStatus === 'CONECTADO' ? 'bg-emerald-400 animate-pulse' :
                      gpsStatus === 'BUSCANDO' ? 'bg-amber-400 animate-pulse' : 'bg-red-500'
                    }`} />
                    {gpsStatus === 'CONECTADO' ? 'GPS ATIVO' :
                     gpsStatus === 'BUSCANDO' ? 'PROCURANDO...' :
                     gpsStatus === 'SEM_SINAL' ? 'SEM SINAL' : 'NÃO SUPORTADO'}
                  </span>
                </div>

                {/* Visual Telemetry stats summary */}
                <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Tempo</span>
                    <span className="text-xl font-bold text-white font-mono">{formatTimeSpan(timeElapsed)}</span>
                  </div>
                  <div className="text-center border-x border-slate-800/80">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Distância</span>
                    <span className="text-xl font-bold text-white font-mono">{distance.toFixed(2)} <span className="text-[10px] text-slate-500">km</span></span>
                  </div>
                  <div className="text-center">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Calorias</span>
                    <span className="text-xl font-bold text-amber-500 font-mono">{calculatedCalories} <span className="text-[10px] text-slate-500">kcal</span></span>
                  </div>
                </div>

                <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <HeartIcon className="w-5 h-5 text-red-500 animate-pulse" />
                    <div>
                      <span className="block text-[9px] text-slate-500 font-bold uppercase">Ritmo Cardíaco</span>
                      <span className="text-sm font-bold text-white font-mono">{currentBpm} BPM</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 font-semibold px-2 py-1 bg-slate-800/60 rounded-lg">
                    {sportType === 'CORRIDA' ? '🏃 Ritmo' : '🚴 Ciclismo'}
                  </span>
                </div>

                {/* Interval Clock visual auxiliary overlay */}
                {workoutMode === 'INTERVAL' && (
                  <IntervalTimer
                    settings={intervalSettings}
                    onSettingsChange={setIntervalSettings}
                    onStateUpdate={(st, timeRem) => {
                      setCurrentIntervalState(st);
                      setCurrentIntervalTimeRemaining(timeRem);
                    }}
                  />
                )}

                {/* Interruption action managers */}
                <div className="flex gap-4 items-center justify-center pt-2">
                  <button
                    id="btn-workout-pause"
                    onClick={() => setIsPaused(!isPaused)}
                    className={`flex-1 py-3 px-5 rounded-2xl text-xs font-bold transition-all shadow cursor-pointer ${
                      isPaused 
                        ? 'bg-[#ea580c] hover:bg-orange-500 text-white shadow-lg shadow-orange-950/20' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700'
                    }`}
                  >
                    {isPaused ? '▶ Retomar' : '⏸ Pausar'}
                  </button>

                  <button
                    id="btn-workout-save-record"
                    onClick={handleSaveWorkout}
                    className="flex-1 bg-green-600 hover:bg-green-500 text-white py-3 px-5 rounded-2xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-green-950/20"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Finalizar e Salvar</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick telemetry instructions */}
            {!isRecording && (
              <div className="bg-[#161B22] border border-slate-800 p-3 rounded-2xl transition-all">
                <h4 className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-orange-500" /> Como simular exercícios?
                </h4>
                <p className="text-[11px] text-slate-400 leading-normal leading-relaxed">
                  Basta clicar em <b>Iniciar</b>! O app atualizará seu percurso gradualmente no mapa e estimará seu metabolismo baseando-se nas configurações do seu bio-perfil de Peso e Altura em tempo real.
                </p>
              </div>
            )}
          </div>
    );
  };

  const renderHistoryTab = () => {
    return (
          <div className="space-y-6">
            {/* Aggregate lifetime analytics cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-center">
                <span className="block text-[9px] text-neutral-500 font-bold uppercase mb-0.5">Corrida</span>
                <span className="text-sm font-bold text-white font-mono">{totalKmRun.toFixed(1)} <span className="text-[9px] text-neutral-500 font-semibold">km</span></span>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-center">
                <span className="block text-[9px] text-neutral-500 font-bold uppercase mb-0.5">Bike</span>
                <span className="text-sm font-bold text-white font-mono">{totalKmBike.toFixed(1)} <span className="text-[9px] text-neutral-500 font-semibold">km</span></span>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-2.5 text-center">
                <span className="block text-[9px] text-neutral-500 font-bold uppercase mb-0.5">Calorias</span>
                <span className="text-sm font-bold text-amber-500 font-mono">{aggregateCalories.toLocaleString()} <span className="text-[9px] text-neutral-500 font-semibold">kcal</span></span>
              </div>
            </div>

            {/* Performance Weekly SVG Charts panel */}
            <WeeklyCharts
              activities={activities}
              weeklyRunGoal={profile.weeklyDistanceGoalRun}
              weeklyBikeGoal={profile.weeklyDistanceGoalBike}
            />

            {/* Historical Workout Lists */}
            <div className="space-y-3">
              <div className="flex justify-between items-center pr-1">
                <h3 className="text-xs font-bold text-neutral-300 uppercase tracking-widest flex items-center gap-1.5">
                  <History className="w-4 h-4 text-orange-500" /> Registro de Atividades
                </h3>
                <span className="text-[10px] text-neutral-500 font-bold font-mono">({activities.length} treinos)</span>
              </div>

              {activities.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-850 rounded-2xl p-6 text-center text-neutral-500">
                  <History className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                  <span className="block text-xs font-semibold">Nenhum treino no feed por enquanto</span>
                  <span className="block text-[10px] text-neutral-600 mt-0.5">Grave sua primeira rota na aba Atividade!</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {activities.map((act) => (
                    <div key={act.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 space-y-2.5 relative group overflow-hidden">
                      {/* Color accent highlight based on sport */}
                      <div className={`absolute top-0 bottom-0 left-0 w-1 ${act.type === 'CORRIDA' ? 'bg-orange-500' : 'bg-amber-400'}`} />

                      <div className="flex justify-between items-start pl-1">
                        <div>
                          <span className="text-xs font-black text-neutral-100 flex items-center gap-1.5">
                            {act.type === 'CORRIDA' ? '🏃 Corrida' : '🚴 Ciclismo'}
                            <span className="text-neutral-500 font-medium text-[10px] font-mono">({act.date})</span>
                          </span>
                          <span className="block text-[10px] text-neutral-400 mt-0.5">{act.title || 'Corrida Estilo Strava'}</span>
                        </div>

                        <button
                          id={`btn-delete-act-${act.id}`}
                          onClick={() => handleDeleteActivity(act.id)}
                          className="p-1 rounded text-neutral-500 hover:text-red-400 hover:bg-neutral-800 transition-colors cursor-pointer"
                          title="Apagar do histórico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Workout stats indicators row */}
                      <div className="grid grid-cols-4 gap-1 pt-2 border-t border-neutral-800/60 pl-1 text-center">
                        <div>
                          <span className="block text-[9px] text-neutral-500 font-medium">Distância</span>
                          <span className="text-xs font-bold text-neutral-200 font-mono">{act.distance.toFixed(1)} km</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-neutral-500 font-medium">Duração</span>
                          <span className="text-xs font-bold text-neutral-200 font-mono">{formatTimeSpan(act.duration)}</span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-neutral-500 font-medium">Calorias</span>
                          <span className="text-xs font-bold text-neutral-200 font-mono">{act.calories} <span className="text-[8px] text-neutral-500 font-normal">kcal</span></span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-neutral-500 font-medium">Ritmo / Vel.</span>
                          <span className="text-xs font-bold text-orange-400 font-mono whitespace-nowrap overflow-hidden text-ellipsis">{act.avgPace}</span>
                        </div>
                      </div>

                      {/* Clean responsive route trajectory diagram */}
                      {act.coordinates && act.coordinates.length > 0 && (
                        <div className="pt-2 pl-1 border-t border-neutral-800/40">
                          <button
                            id={`btn-toggle-route-trace-${act.id}`}
                            onClick={() => setExpandedActivityId(prev => prev === act.id ? null : act.id)}
                            className="w-full flex items-center justify-between text-[10px] uppercase font-bold text-neutral-400 hover:text-orange-500 py-1.5 px-2.5 bg-neutral-950/50 rounded-xl border border-neutral-800/40 hover:border-orange-500/30 transition-all cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                              {expandedActivityId === act.id ? 'Ocultar Traçado do Percurso' : 'Ver Mapa do Percurso'}
                            </span>
                            <ChevronRight className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${expandedActivityId === act.id ? 'rotate-90 text-orange-500' : ''}`} />
                          </button>

                          {expandedActivityId === act.id && (
                            <div className="mt-2.5 transition-all duration-300">
                              <TrajectorySVG coordinates={act.coordinates} sportType={act.type} />
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
  };

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-100 flex flex-col items-center justify-start font-sans transition-all selection:bg-orange-600/30 w-full">
      {/* Target Goal Achievement unlocked popup notifications banner */}
      {activeAchievementUnlocked && (
        <div id="achievement-popup-overlay" className="fixed inset-x-4 top-4 z-50 bg-gradient-to-r from-orange-600 to-amber-500 border border-orange-500 rounded-2xl p-4 shadow-2xl flex items-center justify-between text-white animate-fade-in animate-bounce">
          <div className="flex items-center gap-3">
            <Award className="w-10 h-10 text-white shrink-0" />
            <div>
              <span className="block text-[10px] text-orange-200 font-bold uppercase tracking-wider">Nova Meta Alcançada! 🎉</span>
              <span className="text-sm font-black tracking-tight">{activeAchievementUnlocked}</span>
            </div>
          </div>
          <button
            id="btn-close-achievement-popup"
            onClick={() => setActiveAchievementUnlocked(null)}
            className="bg-black/20 hover:bg-black/40 text-xs font-bold py-1.5 px-3 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Main Responsive Web-App Container */}
      <div 
        className="w-full max-w-md min-h-screen bg-[#0A0C10] md:border-x md:border-slate-800/85 md:shadow-2xl flex flex-col justify-between select-none relative"
      >
        {/* Real-time floating state alerts for Interval timers */}
        {isRecording && workoutMode === 'INTERVAL' && (
          <div className={`p-2 text-center text-[10px] font-black tracking-widest uppercase transition-all duration-300 ${
            currentIntervalState === 'CORRIDA' ? 'bg-orange-600 text-white shadow-lg' :
            currentIntervalState === 'CAMINHADA' ? 'bg-teal-500 text-black shadow-lg' : 'bg-indigo-600 text-white shadow-lg'
          }`}>
            INTERVALO: {currentIntervalState} ({formatTimeSpan(currentIntervalTimeRemaining)})
          </div>
        )}

        {/* Active app header branding panel */}
        <header className="p-4 bg-[#161B22]/90 border-b border-slate-800/80 backdrop-blur shrink-0 flex justify-between items-center sticky top-0 z-20">
          <div className="flex items-center">
            <h1 className="text-sm font-black tracking-tight text-white">STRIDE PRO</h1>
          </div>
        </header>

        {/* Tab content viewer */}
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className={tab === 'RECORD' ? 'block' : 'hidden'}>
            {renderRecordTab()}
          </div>
          <div className={tab === 'HISTORY' ? 'block animate-fade-in' : 'hidden'}>
            {renderHistoryTab()}
          </div>
          <div className={tab === 'BLUETOOTH' ? 'block animate-fade-in' : 'hidden'}>
            <BluetoothHR
              currentBpm={currentBpm}
              onBpmChange={setCurrentBpm}
              isSensorConnected={isSensorConnected}
              setIsSensorConnected={setIsSensorConnected}
              userAge={profile.age}
            />
          </div>
          <div className={tab === 'PROFILE' ? 'block animate-fade-in' : 'hidden'}>
            <ProfileSettings
              profile={profile}
              onSaveProfile={setProfile}
              achievements={achievements}
            />
          </div>
        </main>

        {/* Premium Bottom navigation bar tab bar controllers */}
        <nav className="p-2.5 bg-[#161B22] border-t border-slate-800/60 grid grid-cols-4 gap-1 select-none shrink-0 sticky bottom-0 z-20">
          <button
            id="tab-record"
            onClick={() => setTab('RECORD')}
            className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${
              tab === 'RECORD' 
                ? 'text-orange-500 bg-slate-800/40 font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className={`w-5 h-5 mb-0.5 ${tab === 'RECORD' ? 'stroke-[2.5px] scale-105' : ''}`} />
            <span className="text-[9px] tracking-tight">Atividade</span>
          </button>

          <button
            id="tab-history"
            onClick={() => setTab('HISTORY')}
            className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${
              tab === 'HISTORY' 
                ? 'text-orange-500 bg-slate-800/40 font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className={`w-5 h-5 mb-0.5 ${tab === 'HISTORY' ? 'stroke-[2.5px] scale-105' : ''}`} />
            <span className="text-[9px] tracking-tight">Histórico</span>
          </button>

          <button
            id="tab-bluetooth"
            onClick={() => setTab('BLUETOOTH')}
            className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${
              tab === 'BLUETOOTH' 
                ? 'text-orange-500 bg-slate-800/40 font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bluetooth className={`w-5 h-5 mb-0.5 ${tab === 'BLUETOOTH' ? 'stroke-[2.5px] scale-105' : ''}`} />
            <span className="text-[9px] tracking-tight">Frequência</span>
          </button>

          <button
            id="tab-profile"
            onClick={() => setTab('PROFILE')}
            className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${
              tab === 'PROFILE' 
                ? 'text-orange-500 bg-slate-800/40 font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className={`w-5 h-5 mb-0.5 ${tab === 'PROFILE' ? 'stroke-[2.5px] scale-105' : ''}`} />
            <span className="text-[9px] tracking-tight">Perfil</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
