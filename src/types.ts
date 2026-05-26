/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SportType = 'CORRIDA' | 'CICLISMO';

export type IntervalState = 'AQUECIMENTO' | 'CAMINHADA' | 'CORRIDA' | 'FIM';

export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Activity {
  id: string;
  type: SportType;
  title: string;
  date: string; // ISO string or YYYY-MM-DD
  duration: number; // in seconds
  distance: number; // in km
  avgPace: string; // min/km or km/h
  calories: number; // kcal
  avgHeartRate?: number; // bpm
  maxHeartRate?: number; // bpm
  coordinates: Coordinate[];
}

export interface UserProfile {
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: 'M' | 'F' | 'OUTRO';
  weeklyDistanceGoalRun: number; // km
  weeklyDistanceGoalBike: number; // km
}

export interface IntervalSettings {
  walkDuration: number; // seconds (caminhada/descanso)
  runDuration: number; // seconds (corrida/trabalho)
  cyclesCount: number; // number of repetitions
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  sport: SportType | 'TODOS';
  threshold: number; // distance value or count
  type: 'DISTANCE' | 'CALORIES' | 'COUNT';
  unlocked: boolean;
  dateUnlocked?: string;
  icon: string;
}
