export interface PetAvatar {
  id: string;
  name: string;
  emoji: string;
  greeting: string;
  celebration: string;
  encouragement: string;
}

export const PET_AVATARS: Record<string, PetAvatar> = {
  cat: {
    id: 'cat',
    name: 'Gato 🐱',
    emoji: '🐱',
    greeting: '¡Miau! ¿Listo para machacar hoy?',
    celebration: '¡Miau! ¡Récord histórico conseguido!',
    encouragement: '¡Miau! ¡A la próxima sale perfecta!'
  },
  panda: {
    id: 'panda',
    name: 'Panda 🐼',
    emoji: '🐼',
    greeting: '¡Hola! Bambú y pesas para ponernos fuertes.',
    celebration: '¡BRUTAL! ¡Fuerza de oso panda!',
    encouragement: 'Descansa un poco y nos comemos la siguiente.'
  },
  rabbit: {
    id: 'rabbit',
    name: 'Conejo 🐰',
    emoji: '🐰',
    greeting: '¡A dar saltos de alegría entrenando!',
    celebration: '¡Súper veloz y fuerte!',
    encouragement: '¡Un salto más y lo tienes!'
  },
  bear: {
    id: 'bear',
    name: 'Oso 🐻',
    emoji: '🐻',
    greeting: '¡Grrr! Hoy levantamos pesado.',
    celebration: '¡FUERZA ANIMAL DESATADA!',
    encouragement: 'Respira profundo, eres más fuerte.'
  },
  frog: {
    id: 'frog',
    name: 'Rana 🐸',
    emoji: '🐸',
    greeting: '¡Croac! Hoy rebotamos los PRs.',
    celebration: '¡Salto gigante de rendimiento!',
    encouragement: '¡Ánimo! El próximo intento sale.'
  },
  fox: {
    id: 'fox',
    name: 'Zorro 🦊',
    emoji: '🦊',
    greeting: '¡Estrategia y fuerza hoy!',
    celebration: '¡Jugada maestra! PR registrado.',
    encouragement: 'Ajustamos la técnica y a por ello.'
  },
  dog: {
    id: 'dog',
    name: 'Perro 🐶',
    emoji: '🐶',
    greeting: '¡Guau! ¡Qué ganas de entrenar juntos!',
    celebration: '¡Eres el mejor! ¡Increíble serie!',
    encouragement: '¡Siempre contigo! ¡Tú puedes!'
  }
};

export const getRandomMotivationalMessage = (type: 'set' | 'exercise' | 'pr' | 'workout' | 'fail'): string => {
  const setMsgs = ['💪 ¡Una menos!', '⚡ ¡BRUTAL!', '✨ ¡A TOPE!', '🔥 ¡BOOM!', '💥 ¡ON FIRE!', '😎 ¡Menuda serie!'];
  const exMsgs = ['🔥 ¡Ejercicio destruido!', '✨ ¡Aplastado!', '💥 ¡Dominado con estilo!', '😎 ¡Nivel superior!'];
  const prMsgs = ['🏆 ¡Eso acaba de romperse!', '🔥 ¡NUEVO PR DESBLOQUEADO!', '✨ ¡RÉCORD HISTÓRICO!', '⚡ ¡A OTRO NIVEL!'];
  const workoutMsgs = ['🎉 ¡Misión completada!', '🥳 ¡Entrenamiento arrasado!', '🏆 ¡Victoria absoluta!', '✨ ¡+250 XP Ganados!'];
  const failMsgs = ['😤 Casi... ¡La próxima es tuya!', '💪 ¡Tranqui, aprendemos y seguimos!', '⚡ ¡El progreso no es lineal, vamos!'];

  let arr = setMsgs;
  if (type === 'exercise') arr = exMsgs;
  if (type === 'pr') arr = prMsgs;
  if (type === 'workout') arr = workoutMsgs;
  if (type === 'fail') arr = failMsgs;

  return arr[Math.floor(Math.random() * arr.length)];
};

export const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; comicClass: string }> = {
  Squat: { bg: 'bg-rose-950/40', border: 'border-pink-500', text: 'text-pink-400', badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40', comicClass: 'comic-card-pink' },
  Bench: { bg: 'bg-blue-950/40', border: 'border-blue-500', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40', comicClass: 'comic-card-blue' },
  Deadlift: { bg: 'bg-orange-950/40', border: 'border-orange-500', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-300 border-orange-500/40', comicClass: 'comic-card-orange' },
  'Upper body': { bg: 'bg-purple-950/40', border: 'border-purple-500', text: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40', comicClass: 'comic-card-purple' },
  Pierna: { bg: 'bg-rose-950/40', border: 'border-pink-500', text: 'text-pink-400', badge: 'bg-pink-500/20 text-pink-300 border-pink-500/40', comicClass: 'comic-card-pink' },
  Conditioning: { bg: 'bg-lime-950/40', border: 'border-lime-500', text: 'text-lime-400', badge: 'bg-lime-500/20 text-lime-300 border-lime-500/40', comicClass: 'comic-card-green' },
  Cardio: { bg: 'bg-lime-950/40', border: 'border-lime-500', text: 'text-lime-400', badge: 'bg-lime-500/20 text-lime-300 border-lime-500/40', comicClass: 'comic-card-green' },
  PR: { bg: 'bg-amber-950/40', border: 'border-yellow-500', text: 'text-amber-400', badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', comicClass: 'comic-card-yellow' },
  Default: { bg: 'bg-zinc-900', border: 'border-zinc-800', text: 'text-zinc-200', badge: 'bg-zinc-800 text-zinc-300 border-zinc-700', comicClass: 'comic-card' }
};
