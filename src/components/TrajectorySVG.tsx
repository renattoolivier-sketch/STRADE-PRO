/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Coordinate } from '../types';
import { Compass, Navigation2 } from 'lucide-react';

interface TrajectorySVGProps {
  coordinates: Coordinate[];
  sportType: 'CORRIDA' | 'CICLISMO';
}

export default function TrajectorySVG({ coordinates, sportType }: TrajectorySVGProps) {
  if (!coordinates || coordinates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-500 h-[160px]">
        <Compass className="w-8 h-8 text-neutral-700 mb-1 animate-pulse" />
        <span className="text-[10px] font-mono uppercase tracking-wider">Sem trajeto gravado</span>
      </div>
    );
  }

  // Calculate latitude and longitude boundary boxes
  const lats = coordinates.map(c => c.lat);
  const lngs = coordinates.map(c => c.lng);

  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;

  // Design standard container coordinates (100x100 SVG viewbox)
  const padding = 16;
  const size = 120; // 120width/height for comfortable fit

  // Scaling factor to fit within sizing box while maintaining exact aspect ratio
  const maxDiff = Math.max(latDiff, lngDiff) || 0.0001;

  // Center alignment offset
  const scale = (size - 2 * padding) / maxDiff;
  const xOffset = (size - (lngDiff * scale)) / 2;
  const yOffset = (size - (latDiff * scale)) / 2;

  // Map earth coordinates to SVG coordinate system (y-axis inverted)
  const points = coordinates.map(coord => {
    const x = xOffset + (coord.lng - minLng) * scale;
    const y = size - (yOffset + (coord.lat - minLat) * scale);
    return { x, y };
  });

  // Compose SVG polyline path string
  const pathString = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  return (
    <div className="relative bg-neutral-950/90 border border-neutral-800/80 rounded-2xl p-4 overflow-hidden shadow-inner flex flex-col items-center">
      {/* Dynamic trajectory graphics backdrop branding */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 opacity-40">
        <Navigation2 className="w-3 h-3 text-orange-500 rotate-45" />
        <span className="text-[8px] font-mono tracking-widest text-slate-400 uppercase">ESQUEMA DE TRAJETÓRIA</span>
      </div>

      <div className="w-full flex items-center justify-center p-1">
        <svg 
          viewBox={`0 0 ${size} ${size}`} 
          className="w-[180px] h-[180px]"
        >
          {/* Subtle grid pattern background to enhance aesthetic */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Polyline Route path line with soft glow and orange dashboard gradient */}
          {points.length > 1 && (
            <>
              {/* Drop glow shadow */}
              <path
                d={pathString}
                fill="none"
                stroke={sportType === 'CORRIDA' ? '#ea580c' : '#fbbf24'}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-15 blur-sm"
              />
              {/* Front precise line */}
              <path
                d={pathString}
                fill="none"
                stroke={sportType === 'CORRIDA' ? '#f97316' : '#f59e0b'}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={sportType === 'CICLISMO' ? '1 1' : 'none'}
              />
            </>
          )}

          {/* Render intermittent intermediate milestone splits */}
          {points.map((p, index) => {
            if (index > 0 && index < points.length - 1) {
              return (
                <circle 
                  key={index}
                  cx={p.x} 
                  cy={p.y} 
                  r="2" 
                  fill="#ffffff" 
                  stroke="#171717"
                  strokeWidth="1.2"
                  className="opacity-75"
                />
              );
            }
            return null;
          })}

          {/* Start Point marker (Green circle dot badge) */}
          {startPoint && (
            <g>
              <circle cx={startPoint.x} cy={startPoint.y} r="6" fill="#10b981" className="opacity-25 animate-ping" />
              <circle cx={startPoint.x} cy={startPoint.y} r="4" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
            </g>
          )}

          {/* End/Finish Point marker (Red/Orange final pin flag) */}
          {endPoint && (
            <g>
              <circle cx={endPoint.x} cy={endPoint.y} r="5.5" fill="#ef4444" className="opacity-25" />
              <circle cx={endPoint.x} cy={endPoint.y} r="3.5" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
            </g>
          )}
        </svg>
      </div>

      {/* Trailed stats annotations legend bar */}
      <div className="w-full mt-2 pt-2 border-t border-neutral-900 flex justify-between items-center text-[9px] font-mono text-neutral-400 px-1">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> Início
        </span>
        <span className="text-neutral-500">
          • {coordinates.length} Coordenadas Gravadas •
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Fim
        </span>
      </div>
    </div>
  );
}
