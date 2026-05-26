/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Activity, Coordinate, Achievement } from './types';

// Scenic paths for route simulation
export interface RouteTemplate {
  id: string;
  name: string;
  type: 'CORRIDA' | 'CICLISMO';
  distance: number; // km
  startLocation: string;
  coordinates: Coordinate[];
}

export const ROUTE_TEMPLATES: RouteTemplate[] = [
  {
    id: 'copacabana-beach',
    name: 'Praia de Copacabana (Rio)',
    type: 'CORRIDA',
    distance: 4.2,
    startLocation: 'Copacabana Palace',
    coordinates: [
      { lat: -22.9691, lng: -43.1818 }, // Copacabana Palace
      { lat: -22.9731, lng: -43.1843 },
      { lat: -22.9782, lng: -43.1888 },
      { lat: -22.9806, lng: -43.1915 },
      { lat: -22.9831, lng: -43.1925 },
      { lat: -22.9845, lng: -43.1905 }, // Posto 6 / Forte de Copacabana
    ]
  },
  {
    id: 'lagoa-rodrigo-freitas',
    name: 'Orla da Lagoa & Ipanema',
    type: 'CICLISMO',
    distance: 7.5,
    startLocation: 'Parque dos Patins',
    coordinates: [
      { lat: -22.9715, lng: -43.2185 }, // Parque dos Patins
      { lat: -22.9790, lng: -43.2140 }, // Club de Regatas Flamengo
      { lat: -22.9835, lng: -43.2085 }, // Jardim de Alah
      { lat: -22.9875, lng: -43.2030 }, // Orla de Ipanema (Posto 9)
      { lat: -22.9890, lng: -43.1930 }, // Arpoador
    ]
  },
  {
    id: 'ibirapuera-loop',
    name: 'Volta no Pq. Ibirapuera (SP)',
    type: 'CORRIDA',
    distance: 3.2,
    startLocation: 'Monumento às Bandeiras',
    coordinates: [
      { lat: -23.5786, lng: -46.6601 }, // Entrada Monumento
      { lat: -23.5849, lng: -46.6621 }, // Museu de Arte Moderna (MAM)
      { lat: -23.5888, lng: -46.6578 }, // Auditório Ibirapuera
      { lat: -23.5855, lng: -46.6521 }, // Pavilhão Japonês
      { lat: -23.5799, lng: -46.6558 }, // Obelisco
    ]
  }
];

// Initial historical activities (spanning the past 7 days to populate weekly stats beautifully)
export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act-1',
    type: 'CORRIDA',
    title: 'Corrida Matinal no Parque',
    date: '2026-05-20',
    duration: 1800, // 30 min
    distance: 5.2,
    avgPace: '05:46',
    calories: 390,
    avgHeartRate: 145,
    maxHeartRate: 162,
    coordinates: ROUTE_TEMPLATES[2].coordinates
  },
  {
    id: 'act-2',
    type: 'CICLISMO',
    title: 'Giro Rápido Lagoa',
    date: '2026-05-22',
    duration: 3600, // 60 min
    distance: 18.5,
    avgPace: '18.5 km/h',
    calories: 620,
    avgHeartRate: 132,
    maxHeartRate: 155,
    coordinates: ROUTE_TEMPLATES[1].coordinates
  },
  {
    id: 'act-3',
    type: 'CORRIDA',
    title: 'Treino de Intervalo Expirante',
    date: '2026-05-23',
    duration: 1200, // 20 min
    distance: 3.5,
    avgPace: '05:42',
    calories: 270,
    avgHeartRate: 158,
    maxHeartRate: 177,
    coordinates: ROUTE_TEMPLATES[0].coordinates
  },
  {
    id: 'act-4',
    type: 'CICLISMO',
    title: 'Pedal de Treino Longo',
    date: '2026-05-24',
    duration: 5400, // 1h30
    distance: 32.1,
    avgPace: '21.4 km/h',
    calories: 990,
    avgHeartRate: 138,
    maxHeartRate: 160,
    coordinates: ROUTE_TEMPLATES[1].coordinates
  },
  {
    id: 'act-5',
    type: 'CORRIDA',
    title: 'Tiro Rápido Noturno',
    date: '2026-05-25',
    duration: 900, // 15 min
    distance: 2.8,
    avgPace: '05:21',
    calories: 215,
    avgHeartRate: 151,
    maxHeartRate: 169,
    coordinates: ROUTE_TEMPLATES[2].coordinates
  }
];

// Initial status of goal achievements
export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-first-run',
    title: 'Primeiro Passo',
    description: 'Concluiu a sua primeira atividade de corrida.',
    sport: 'CORRIDA',
    threshold: 1,
    type: 'COUNT',
    unlocked: true,
    dateUnlocked: '2026-05-20',
    icon: '🏃'
  },
  {
    id: 'ach-run-5k',
    title: 'Máquina dos 5k',
    description: 'Correu uma distância de mais de 5km de uma vez.',
    sport: 'CORRIDA',
    threshold: 5,
    type: 'DISTANCE',
    unlocked: true,
    dateUnlocked: '2026-05-20',
    icon: '⚡'
  },
  {
    id: 'ach-bike-20k',
    title: 'Ciclista Avançado',
    description: 'Subiu na bike e pedalou por mais de 20km.',
    sport: 'CICLISMO',
    threshold: 20,
    type: 'DISTANCE',
    unlocked: true,
    dateUnlocked: '2026-05-24',
    icon: '🚴'
  },
  {
    id: 'ach-calories-500',
    title: 'Fogueira Calórica',
    description: 'Queimou mais de 500 kcal em um único treino.',
    sport: 'TODOS',
    threshold: 500,
    type: 'CALORIES',
    unlocked: true,
    dateUnlocked: '2026-05-22',
    icon: '🔥'
  },
  {
    id: 'ach-deep-run',
    title: 'Ultrapassando Limites',
    description: 'Registrou uma corrida com mais de 10km.',
    sport: 'CORRIDA',
    threshold: 10,
    type: 'DISTANCE',
    unlocked: false,
    icon: '🏆'
  },
  {
    id: 'ach-giant-pedal',
    title: 'Tour Gigante',
    description: 'Fez um percurso de bike maior que 50km.',
    sport: 'CICLISMO',
    threshold: 50,
    type: 'DISTANCE',
    unlocked: false,
    icon: '👑'
  }
];
