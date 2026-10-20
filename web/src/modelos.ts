/** Sugestões prontas para o responsável começar rápido. */
import type { Tarefa } from './api.ts';

type Modelo = Pick<Tarefa, 'titulo' | 'icone' | 'pontos' | 'modo' | 'dias'> & { hora?: string };

export const MODELOS_TAREFA: Modelo[] = [
  { titulo: 'Escovar os dentes', icone: '🪥', pontos: 10, modo: 'direto', dias: '0123456' },
  { titulo: 'Arrumar a cama', icone: '🛏️', pontos: 10, modo: 'foto', dias: '0123456' },
  { titulo: 'Preparar a mochila', icone: '🎒', pontos: 10, modo: 'aprovacao', dias: '12345', hora: '07:00' },
  { titulo: 'Fazer a lição de casa', icone: '📚', pontos: 20, modo: 'aprovacao', dias: '12345', hora: '15:00' },
  { titulo: 'Guardar os brinquedos', icone: '🧸', pontos: 10, modo: 'foto', dias: '0123456' },
  { titulo: 'Tomar banho', icone: '🛁', pontos: 10, modo: 'direto', dias: '0123456' },
  { titulo: 'Colocar a roupa suja no cesto', icone: '🧺', pontos: 5, modo: 'direto', dias: '0123456' },
  { titulo: 'Encher a garrafinha de água', icone: '💧', pontos: 5, modo: 'direto', dias: '12345' },
  { titulo: 'Ler por 15 minutos', icone: '📖', pontos: 15, modo: 'aprovacao', dias: '0123456' },
  { titulo: 'Ajudar a pôr a mesa', icone: '🍽️', pontos: 10, modo: 'aprovacao', dias: '0123456' },
  { titulo: 'Dar comida para o bichinho', icone: '🐶', pontos: 10, modo: 'direto', dias: '0123456' },
  { titulo: 'Comer frutas no lanche', icone: '🍎', pontos: 5, modo: 'direto', dias: '0123456' },
];

export const MODELOS_RECOMPENSA = [
  { titulo: 'Sorvete no fim de semana', icone: '🍦', custo: 100 },
  { titulo: '30 minutos de videogame', icone: '🎮', custo: 60 },
  { titulo: 'Escolher o filme da noite', icone: '🎬', custo: 80 },
  { titulo: 'Passeio no parque', icone: '🌳', custo: 150 },
  { titulo: 'Dormir mais tarde no sábado', icone: '🌙', custo: 120 },
  { titulo: 'Livro novo', icone: '📘', custo: 400 },
];

export const ICONES_TAREFA = ['⭐', '🪥', '🛏️', '🎒', '📚', '🧸', '🛁', '🧺', '💧', '📖', '🍽️', '🐶', '🍎', '👕', '🧹', '🌱', '🎹', '⚽', '🙏', '🥦', '😴', '🧦', '🗑️', '✏️'];
export const ICONES_RECOMPENSA = ['🎁', '🍦', '🎮', '🎬', '🌳', '🌙', '📘', '🍕', '🧁', '🎨', '🚲', '🏊', '🎡', '🧩', '🍫', '📺'];
