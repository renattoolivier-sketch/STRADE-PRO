/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Heart, Bluetooth, ShieldAlert, CheckCircle, Info, Activity as HeartbeatIcon } from 'lucide-react';

interface BluetoothHRProps {
  currentBpm: number;
  onBpmChange: (bpm: number) => void;
  isSensorConnected: boolean;
  setIsSensorConnected: (connected: boolean) => void;
  userAge: number;
}

export default function BluetoothHR({
  currentBpm,
  onBpmChange,
  isSensorConnected,
  setIsSensorConnected,
  userAge,
}: BluetoothHRProps) {
  const [bluetoothSupported, setBluetoothSupported] = useState<boolean>(true);
  const [device, setDevice] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [simulationMode, setSimulationMode] = useState<boolean>(true);
  const [targetBpm, setTargetBpm] = useState<number>(135);
  
  // Checking Web Bluetooth support on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !(navigator as any).bluetooth) {
      setBluetoothSupported(false);
    }
  }, []);

  // Soft handle pulse simulating slightly fluctuating heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      if (simulationMode || isSensorConnected) {
        // Heart rate fluctuations
        const fluctuation = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
        let nextBpm = currentBpm;

        if (simulationMode) {
          // Approach adjustable targetBpm
          if (currentBpm < targetBpm) {
            nextBpm += Math.max(1, Math.floor((targetBpm - currentBpm) / 5)) + fluctuation;
          } else if (currentBpm > targetBpm) {
            nextBpm -= Math.max(1, Math.floor((currentBpm - targetBpm) / 5)) + fluctuation;
          } else {
            nextBpm += fluctuation;
          }
        } else {
          nextBpm += fluctuation;
        }

        // Clamp BPM between 40 and 200
        nextBpm = Math.min(Math.max(nextBpm, 40), 200);
        onBpmChange(nextBpm);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [currentBpm, targetBpm, simulationMode, isSensorConnected, onBpmChange]);

  // Connect via Web Bluetooth
  const connectWebBluetooth = async () => {
    setErrorMsg('');
    setIsScanning(true);
    try {
      if (!(navigator as any).bluetooth) {
        throw new Error('Web Bluetooth não é suportado por este navegador.');
      }

      const selectedDevice = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['battery_service']
      });

      setDevice(selectedDevice);
      
      const server = await selectedDevice.gatt?.connect();
      if (!server) throw new Error('Não foi possível conectar ao servidor GATT.');

      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');

      // Handle HR alerts
      characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        if (!value) return;
        
        // Parse Heart Rate Measurement according to GATT specs
        const flags = value.getUint8(0);
        const rate16Bits = flags & 0x1;
        let pBpm = 0;
        if (rate16Bits) {
          pBpm = value.getUint16(1, true);
        } else {
          pBpm = value.getUint8(1);
        }
        
        onBpmChange(pBpm);
      });

      await characteristic.startNotifications();
      setIsSensorConnected(true);
      setSimulationMode(false);
      
      selectedDevice.addEventListener('gattserverdisconnected', () => {
        setIsSensorConnected(false);
        setSimulationMode(true);
        setErrorMsg('Dispositivo Bluetooth desconectado.');
      });

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao buscar ou parear dispositivo.');
      setIsSensorConnected(false);
    } finally {
      setIsScanning(false);
    }
  };

  const disconnectBluetooth = () => {
    if (device && device.gatt?.connected) {
      device.gatt.disconnect();
    }
    setDevice(null);
    setIsSensorConnected(false);
    setSimulationMode(true);
    setErrorMsg('Monitor cardíaco desconectado. Voltando ao simulador.');
  };

  // Heart Rate Zones calculations
  const maxHR = 220 - userAge;
  const fatBurnMin = Math.round(maxHR * 0.5);
  const fatBurnMax = Math.round(maxHR * 0.7);
  const aerobicMin = Math.round(maxHR * 0.7);
  const aerobicMax = Math.round(maxHR * 0.85);

  let currentZone = 'Repouso / Aquecimento';
  let zoneColor = 'text-green-400 border-green-500/30 bg-green-500/10';

  if (currentBpm >= fatBurnMin && currentBpm < fatBurnMax) {
    currentZone = 'Queima de Gordura 🔥';
    zoneColor = 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
  } else if (currentBpm >= aerobicMin && currentBpm < aerobicMax) {
    currentZone = 'Aeróbico (Cardio) ⚡';
    zoneColor = 'text-orange-400 border-orange-500/30 bg-orange-500/10';
  } else if (currentBpm >= aerobicMax) {
    currentZone = 'Anaeróbico (Esforço Máximo) 🔴';
    zoneColor = 'text-red-400 border-red-500/30 bg-red-500/10';
  }

  // Calculate pulse speed for the animation
  const animationDuration = `${60 / currentBpm}s`;

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Bluetooth Integration Banner */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 mb-3">
          <Bluetooth className="w-5 h-5 text-orange-500" /> Sensor Cardíaco BLE
        </h3>
        
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          Conecte o seu sensor de batimento cardíaco (cintas Polar, Garmin, etc.) para registrar seu esforço metabólico em tempo real e calcular o gasto calórico exato.
        </p>

        {!isSensorConnected ? (
          <button
            id="btn-scan-bluetooth"
            onClick={connectWebBluetooth}
            disabled={isScanning}
            className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-950/20 cursor-pointer"
          >
            {isScanning ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Buscando Dispositivos...</span>
              </>
            ) : (
              <>
                <Bluetooth className="w-4 h-4" />
                <span>Conectar via Bluetooth</span>
              </>
            )}
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 text-xs text-green-400 rounded-xl">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Conectado a {device?.name || 'Monitor de Frequência'}!</span>
            </div>
            <button
              id="btn-disconnect-bluetooth"
              onClick={disconnectBluetooth}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer border border-slate-700"
            >
              Desconectar Sensor
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="mt-3 flex items-start gap-2 p-3 bg-red-950/40 border border-red-900/30 rounded-xl text-xs text-red-400">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {!bluetoothSupported && (
          <div className="mt-3 flex items-start gap-2 p-2.5 bg-slate-800/40 rounded-xl text-[11px] text-slate-400 leading-normal border border-slate-800/80">
            <Info className="w-3.5 h-3.5 shrink-0 text-orange-500 mt-0.5" />
            <span>Este navegador/iframe não suporta Web Bluetooth corporativo direta. Ativamos o simulador inteligente abaixo.</span>
          </div>
        )}
      </div>

      {/* Live Pulsing Heart Simulator */}
      <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm hover:border-slate-700 transition-all">
        {/* Dynamic ambient pulse */}
        <div 
          className="absolute w-36 h-36 rounded-full bg-red-500/5 -z-10 animate-ping"
          style={{ animationDuration }}
        />
        
        <div className="relative mb-2">
          <Heart 
            className="w-16 h-16 text-red-500 fill-red-500 animate-pulse"
            style={{ animationDuration }}
          />
          <HeartbeatIcon className="w-5 h-5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="text-5xl font-black text-white tracking-tighter mb-1 font-mono">
          {currentBpm} <span className="text-sm font-bold text-slate-400">BPM</span>
        </div>

        <div className={`px-4 py-1 rounded-full text-xs font-bold border transition-colors ${zoneColor} inline-flex items-center gap-1.5`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          {currentZone}
        </div>

        <div className="w-full mt-6 pt-4 border-t border-slate-800 grid grid-cols-3 gap-2">
          <div className="text-center">
            <span className="block text-[10px] text-slate-500 font-bold uppercase">Zona Queima</span>
            <span className="text-[11px] font-bold text-slate-300 font-mono">{fatBurnMin}-{fatBurnMax} bpm</span>
          </div>
          <div className="text-center border-x border-slate-800">
            <span className="block text-[10px] text-slate-500 font-bold uppercase">Aeróbica</span>
            <span className="text-[11px] font-bold text-slate-300 font-mono">{aerobicMin}-{aerobicMax} bpm</span>
          </div>
          <div className="text-center">
            <span className="block text-[10px] text-slate-500 font-bold uppercase">FCM (Máxima)</span>
            <span className="text-[11px] font-bold text-red-400 font-mono">{maxHR} bpm</span>
          </div>
        </div>
      </div>

      {/* Manual Simulator Controls */}
      {simulationMode && (
        <div className="bg-[#161B22] border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition-all">
          <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Simulador de Batimento
          </h4>
          <p className="text-[11px] text-slate-400 leading-normal mb-3">
            Arraste para simular o esforço físico do seu corpo de acordo com a intensidade da corrida ou pedalada:
          </p>
          <div className="space-y-3">
            <div className="flex justify-between text-[10px] font-bold text-slate-400 font-mono">
              <span>Alvo: {targetBpm} BPM</span>
              <span className="text-orange-500">
                {targetBpm < 100 ? '🚴 Recuperação' : targetBpm < 140 ? '🏃 Ritmo' : '🔥 Esforço Ativo'}
              </span>
            </div>
            <input
              id="slider-bpm-simulator"
              type="range"
              min="50"
              max="190"
              value={targetBpm}
              onChange={(e) => setTargetBpm(Number(e.target.value))}
              className="w-full accent-orange-600 h-1.5 bg-[#0A0C10] rounded-lg cursor-pointer border border-slate-850"
            />
            <div className="flex justify-between text-[9px] text-slate-600 font-mono">
              <span>50 bpm (Repouso)</span>
              <span>120 bpm (Aeróbico)</span>
              <span>190 bpm (Múltiplo)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
