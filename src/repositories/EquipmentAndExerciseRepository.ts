import { supabase } from '../lib/supabase';
import { EquipmentItem, Exercise } from '../types';
import { isUuid, isDummyLocalUuid } from '../utils/uuid';

async function withTimeout<T>(promise: PromiseLike<T>, ms = 2000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Network timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

export const SEEDED_EQUIPMENT: EquipmentItem[] = [
  { id: 'eq-1', name: 'Rack', slug: 'rack', category: 'structure' },
  { id: 'eq-2', name: 'Barra olímpica', slug: 'barra-olimpica', category: 'free_weights' },
  { id: 'eq-3', name: 'Discos', slug: 'discos', category: 'free_weights' },
  { id: 'eq-4', name: 'Banco', slug: 'banco', category: 'benches' },
  { id: 'eq-5', name: 'Máquina de poleas', slug: 'maquina-de-poleas', category: 'cables' },
  { id: 'eq-6', name: 'Mancuernas', slug: 'mancuernas', category: 'free_weights' },
  { id: 'eq-7', name: 'Kettlebells', slug: 'kettlebells', category: 'free_weights' },
  { id: 'eq-8', name: 'Barra de dominadas', slug: 'barra-de-dominadas', category: 'bodyweight' },
  { id: 'eq-9', name: 'Anillas', slug: 'anillas', category: 'bodyweight' },
  { id: 'eq-10', name: 'Bandas', slug: 'bandas', category: 'accessories' },
  { id: 'eq-11', name: 'Cajón', slug: 'cajon', category: 'conditioning' },
  { id: 'eq-12', name: 'Elíptica', slug: 'eliptica', category: 'cardio' }
];

export const SEEDED_EXERCISES: Exercise[] = [
  {
    id: 'ex-1',
    name: 'Back Squat',
    slug: 'back-squat',
    category: 'Squat',
    movement_pattern: 'Squat',
    difficulty: 'Intermediate',
    description: 'Sentadilla trasera con barra olímpica en rack.',
    instructions: ['Coloca la barra en trapecios', 'Desciende hasta romper el paralelo', 'Sube explosivamente'],
    primary_muscles: ['cuádriceps', 'glúteos'],
    secondary_muscles: ['isquiotibiales', 'zona lumbar'],
    equipment_required: ['rack', 'barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: true,
    is_conditioning: false
  },
  {
    id: 'ex-2',
    name: 'Front Squat',
    slug: 'front-squat',
    category: 'Squat',
    movement_pattern: 'Squat',
    difficulty: 'Intermediate',
    description: 'Sentadilla frontal manteniendo el torso erguido.',
    instructions: ['Apoya la barra en deltoides anteriores', 'Mantén codos altos', 'Desciende profundamente'],
    primary_muscles: ['cuádriceps'],
    secondary_muscles: ['glúteos', 'espalda alta'],
    equipment_required: ['rack', 'barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-3',
    name: 'Paused Squat',
    slug: 'paused-squat',
    category: 'Squat',
    movement_pattern: 'Squat',
    difficulty: 'Intermediate',
    description: 'Sentadilla con pausa de 2 segundos en el fondo.',
    instructions: ['Baja en control', 'Pausa 2s abajo sin perder tensión', 'Sube con fuerza'],
    primary_muscles: ['cuádriceps', 'glúteos'],
    secondary_muscles: ['core'],
    equipment_required: ['rack', 'barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: true,
    is_conditioning: false
  },
  {
    id: 'ex-4',
    name: 'Tempo Squat',
    slug: 'tempo-squat',
    category: 'Squat',
    movement_pattern: 'Squat',
    difficulty: 'Intermediate',
    description: 'Sentadilla con tempo controlado (ej. 3s bajada).',
    instructions: ['Desciende contando 3 segundos', 'Sube en 1 segundo'],
    primary_muscles: ['cuádriceps', 'glúteos'],
    secondary_muscles: ['core'],
    equipment_required: ['rack', 'barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-5',
    name: 'Bulgarian Split Squat',
    slug: 'bulgarian-split-squat',
    category: 'Squat',
    movement_pattern: 'Lunge',
    difficulty: 'Beginner',
    description: 'Sentadilla búlgara unipodal con pie trasero elevado.',
    instructions: ['Apoya un pie en el banco', 'Desciende flexionando la rodilla delantera'],
    primary_muscles: ['cuádriceps', 'glúteos'],
    secondary_muscles: ['isquiotibiales'],
    equipment_required: ['mancuernas', 'banco'],
    is_compound: true,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-6',
    name: 'Bench Press',
    slug: 'bench-press',
    category: 'Bench',
    movement_pattern: 'Horizontal Push',
    difficulty: 'Intermediate',
    description: 'Press de banca plano con barra.',
    instructions: ['Crea retractor escapular', 'Baja la barra al esternón', 'Empuja fuerte arriba'],
    primary_muscles: ['pectoral'],
    secondary_muscles: ['tríceps', 'deltoides anterior'],
    equipment_required: ['rack', 'banco', 'barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: true,
    is_conditioning: false
  },
  {
    id: 'ex-7',
    name: 'Paused Bench Press',
    slug: 'paused-bench-press',
    category: 'Bench',
    movement_pattern: 'Horizontal Push',
    difficulty: 'Intermediate',
    description: 'Press de banca con pausa de competición en el pecho.',
    instructions: ['Toca el pecho', 'Pausa 1s fija', 'Empuja a máxima velocidad'],
    primary_muscles: ['pectoral'],
    secondary_muscles: ['tríceps', 'deltoides anterior'],
    equipment_required: ['rack', 'banco', 'barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: true,
    is_conditioning: false
  },
  {
    id: 'ex-8',
    name: 'Close Grip Bench Press',
    slug: 'close-grip-bench-press',
    category: 'Bench',
    movement_pattern: 'Horizontal Push',
    difficulty: 'Intermediate',
    description: 'Press de banca con agarre estrecho enfocado en tríceps.',
    instructions: ['Agarre al ancho de hombros', 'Mantén codos pegados al cuerpo'],
    primary_muscles: ['tríceps'],
    secondary_muscles: ['pectoral', 'deltoides anterior'],
    equipment_required: ['rack', 'banco', 'barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-9',
    name: 'Cable Fly',
    slug: 'cable-fly',
    category: 'Bench',
    movement_pattern: 'Isolation',
    difficulty: 'Beginner',
    description: 'Aperturas en polea para hipertrofia pectoral.',
    instructions: ['Abraza el aire juntando las manos en el centro'],
    primary_muscles: ['pectoral'],
    secondary_muscles: ['deltoides anterior'],
    equipment_required: ['maquina-de-poleas'],
    is_compound: false,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-10',
    name: 'Deadlift',
    slug: 'deadlift',
    category: 'Deadlift',
    movement_pattern: 'Hinge',
    difficulty: 'Intermediate',
    description: 'Peso muerto convencional desde el suelo.',
    instructions: ['Espalda neutra', 'Empuja con las piernas y extiende cadera arriba'],
    primary_muscles: ['isquiotibiales', 'glúteos', 'zona lumbar'],
    secondary_muscles: ['espalda alta', 'antebrazos'],
    equipment_required: ['barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: true,
    is_conditioning: false
  },
  {
    id: 'ex-11',
    name: 'Romanian Deadlift',
    slug: 'romanian-deadlift',
    category: 'Deadlift',
    movement_pattern: 'Hinge',
    difficulty: 'Intermediate',
    description: 'Peso muerto rumano enfatizando estiramiento de isquios.',
    instructions: ['Flexiona levemente rodillas y lleva cadera muy atrás'],
    primary_muscles: ['isquiotibiales', 'glúteos'],
    secondary_muscles: ['zona lumbar'],
    equipment_required: ['barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-12',
    name: 'Paused Deadlift',
    slug: 'paused-deadlift',
    category: 'Deadlift',
    movement_pattern: 'Hinge',
    difficulty: 'Advanced',
    description: 'Peso muerto con pausa a la altura de las espinillas.',
    instructions: ['Despega del suelo y frena 2s a media espinilla antes de bloquear'],
    primary_muscles: ['isquiotibiales', 'zona lumbar'],
    secondary_muscles: ['espalda alta'],
    equipment_required: ['barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: true,
    is_conditioning: false
  },
  {
    id: 'ex-13',
    name: 'Hip Thrust',
    slug: 'hip-thrust',
    category: 'Deadlift',
    movement_pattern: 'Hinge',
    difficulty: 'Beginner',
    description: 'Empuje de cadera con barra apoyado en banco.',
    instructions: ['Apoya escápulas en banco', 'Extiende cadera apretando glúteos arriba'],
    primary_muscles: ['glúteos'],
    secondary_muscles: ['isquiotibiales'],
    equipment_required: ['banco', 'barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-14',
    name: 'Overhead Press',
    slug: 'overhead-press',
    category: 'Upper body',
    movement_pattern: 'Vertical Push',
    difficulty: 'Intermediate',
    description: 'Press militar de pie con barra.',
    instructions: ['Core y glúteos apretados', 'Empuja la barra verticalmente sobre la cabeza'],
    primary_muscles: ['hombros'],
    secondary_muscles: ['tríceps', 'pectoral superior'],
    equipment_required: ['barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-15',
    name: 'Barbell Row',
    slug: 'barbell-row',
    category: 'Upper body',
    movement_pattern: 'Horizontal Pull',
    difficulty: 'Intermediate',
    description: 'Remo con barra inclinado.',
    instructions: ['Inclinación de torso 45°', 'Lleva la barra a la parte baja del esternón'],
    primary_muscles: ['dorsales', 'espalda alta'],
    secondary_muscles: ['bíceps'],
    equipment_required: ['barra-olimpica', 'discos'],
    is_compound: true,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-16',
    name: 'Lat Pulldown',
    slug: 'lat-pulldown',
    category: 'Upper body',
    movement_pattern: 'Vertical Pull',
    difficulty: 'Beginner',
    description: 'Jalón al pecho en máquina de poleas.',
    instructions: ['Tracciona con codos apuntando abajo hasta tocar el pecho alto'],
    primary_muscles: ['dorsales'],
    secondary_muscles: ['bíceps', 'espalda alta'],
    equipment_required: ['maquina-de-poleas'],
    is_compound: true,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-17',
    name: 'Cable Row',
    slug: 'cable-row',
    category: 'Upper body',
    movement_pattern: 'Horizontal Pull',
    difficulty: 'Beginner',
    description: 'Remo sentado en polea baja.',
    instructions: ['Mantén espalda recta y junta escápulas al traccionar'],
    primary_muscles: ['espalda alta', 'dorsales'],
    secondary_muscles: ['bíceps'],
    equipment_required: ['maquina-de-poleas'],
    is_compound: true,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-18',
    name: 'Face Pull',
    slug: 'face-pull',
    category: 'Upper body',
    movement_pattern: 'Horizontal Pull',
    difficulty: 'Beginner',
    description: 'Jalón a la cara con cuerda en polea para salud del hombro.',
    instructions: ['Tracciona la cuerda hacia el entrecejo separando las manos'],
    primary_muscles: ['deltoides posterior', 'manguito rotador'],
    secondary_muscles: ['espalda alta'],
    equipment_required: ['maquina-de-poleas'],
    is_compound: false,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-19',
    name: 'Cable Curl',
    slug: 'cable-curl',
    category: 'Upper body',
    movement_pattern: 'Isolation',
    difficulty: 'Beginner',
    description: 'Curl de bíceps en polea baja con tensión continua.',
    instructions: ['Codos fijos a los lados', 'Flexiona antebrazos apretando bíceps'],
    primary_muscles: ['bíceps'],
    secondary_muscles: ['antebrazos'],
    equipment_required: ['maquina-de-poleas'],
    is_compound: false,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-20',
    name: 'Rope Triceps Pushdown',
    slug: 'rope-triceps-pushdown',
    category: 'Upper body',
    movement_pattern: 'Isolation',
    difficulty: 'Beginner',
    description: 'Extensión de tríceps en polea alta con cuerda.',
    instructions: ['Extiende codos abajo y abre la cuerda al final'],
    primary_muscles: ['tríceps'],
    secondary_muscles: [],
    equipment_required: ['maquina-de-poleas'],
    is_compound: false,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-21',
    name: 'Cable Lateral Raise',
    slug: 'cable-lateral-raise',
    category: 'Upper body',
    movement_pattern: 'Isolation',
    difficulty: 'Beginner',
    description: 'Elevaciones laterales en polea para deltoides lateral.',
    instructions: ['Eleva la polea lateralmente hasta la altura del hombro'],
    primary_muscles: ['deltoides lateral'],
    secondary_muscles: [],
    equipment_required: ['maquina-de-poleas'],
    is_compound: false,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-22',
    name: 'Straight Arm Pulldown',
    slug: 'straight-arm-pulldown',
    category: 'Upper body',
    movement_pattern: 'Isolation',
    difficulty: 'Beginner',
    description: 'Jalón con brazos rectos para aislamiento de dorsal.',
    instructions: ['Empuja la barra hacia la cadera manteniendo codos rectos'],
    primary_muscles: ['dorsales'],
    secondary_muscles: ['tríceps cabeza larga'],
    equipment_required: ['maquina-de-poleas'],
    is_compound: false,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-23',
    name: 'Step Up',
    slug: 'step-up',
    category: 'Pierna',
    movement_pattern: 'Lunge',
    difficulty: 'Beginner',
    description: 'Subida a cajón con mancuernas.',
    instructions: ['Pisa firme en el cajón y sube impulsando con la pierna de apoyo'],
    primary_muscles: ['cuádriceps', 'glúteos'],
    secondary_muscles: ['gemelos'],
    equipment_required: ['cajon', 'mancuernas'],
    is_compound: false,
    is_powerlifting: false,
    is_conditioning: false
  },
  {
    id: 'ex-24',
    name: 'Elliptical Zone 2',
    slug: 'elliptical-zone-2',
    category: 'Conditioning',
    movement_pattern: 'Cardio',
    difficulty: 'Beginner',
    description: 'Cardio continuo aeróbico suave en elíptica.',
    instructions: ['Mantén ritmo suave conversacional durante el tiempo objetivo'],
    primary_muscles: ['cardio'],
    secondary_muscles: [],
    equipment_required: ['eliptica'],
    is_compound: false,
    is_powerlifting: false,
    is_conditioning: true
  },
  {
    id: 'ex-25',
    name: 'Elliptical Intervals',
    slug: 'elliptical-intervals',
    category: 'Conditioning',
    movement_pattern: 'Cardio',
    difficulty: 'Intermediate',
    description: 'Intervalos de alta intensidad en elíptica (ej. 30s sprint / 30s suave).',
    instructions: ['Alterna esprints máximos con recuperación activa'],
    primary_muscles: ['cardio'],
    secondary_muscles: [],
    equipment_required: ['eliptica'],
    is_compound: false,
    is_powerlifting: false,
    is_conditioning: true
  }
];

export class EquipmentRepository {
  private static LOCAL_EQ_KEY = 'cachitas_profile_equipment_';

  static async getAllEquipment(): Promise<EquipmentItem[]> {
    try {
      const res: any = await withTimeout(supabase.from('equipment').select('*'));
      if (res.data && res.data.length > 0) return res.data;
    } catch {
      // offline
    }
    return SEEDED_EQUIPMENT;
  }

  static async getProfileEquipmentSlugs(profileId: string): Promise<string[]> {
    if (isUuid(profileId)) {
      try {
        const res: any = await withTimeout(
          supabase
            .from('profile_equipment')
            .select('equipment:equipment_id(slug)')
            .eq('profile_id', profileId)
        );

        if (res.data && res.data.length > 0) {
          return res.data.map((item: any) => item.equipment?.slug).filter(Boolean);
        }
      } catch {
        // offline
      }
    }

    const local = localStorage.getItem(this.LOCAL_EQ_KEY + profileId);
    if (local) {
      try {
        return JSON.parse(local);
      } catch {}
    }
    return SEEDED_EQUIPMENT.map(e => e.slug);
  }

  static async setProfileEquipmentSlugs(profileId: string, slugs: string[]): Promise<void> {
    localStorage.setItem(this.LOCAL_EQ_KEY + profileId, JSON.stringify(slugs));
    if (isUuid(profileId)) {
      try {
        await withTimeout(supabase.from('profile_equipment').delete().eq('profile_id', profileId));
        const allEq = await this.getAllEquipment();
        const rows = slugs
          .map(slug => allEq.find(e => e.slug === slug))
          .filter(Boolean)
          .map(eq => ({
            profile_id: profileId,
            equipment_id: eq!.id
          }));

        if (rows.length > 0) {
          await withTimeout(supabase.from('profile_equipment').insert(rows));
        }
      } catch {
        // offline fallback
      }
    }
  }
}

export class ExerciseRepository {
  private static LOCAL_FAVS_KEY = 'cachitas_profile_favs_';

  static async getAllExercises(): Promise<Exercise[]> {
    try {
      const res: any = await withTimeout(supabase.from('exercises').select('*'));
      if (res.data && res.data.length > 0) return res.data as Exercise[];
    } catch {
      // offline
    }
    return SEEDED_EXERCISES;
  }

  static async getExerciseById(id: string): Promise<Exercise | null> {
    const all = await this.getAllExercises();
    return all.find(e => e.id === id || e.slug === id) || null;
  }

  static async getFavoriteExerciseIds(profileId: string): Promise<string[]> {
    if (isUuid(profileId)) {
      try {
        const res: any = await withTimeout(
          supabase
            .from('profile_favorite_exercises')
            .select('exercise_id')
            .eq('profile_id', profileId)
        );
        if (res.data) return res.data.map((d: any) => d.exercise_id);
      } catch {}
    }

    const local = localStorage.getItem(this.LOCAL_FAVS_KEY + profileId);
    if (local) {
      try { return JSON.parse(local); } catch {}
    }
    return [];
  }

  static async toggleFavoriteExercise(profileId: string, exerciseId: string): Promise<boolean> {
    const favs = await this.getFavoriteExerciseIds(profileId);
    const exists = favs.includes(exerciseId);
    const updated = exists ? favs.filter(id => id !== exerciseId) : [...favs, exerciseId];

    localStorage.setItem(this.LOCAL_FAVS_KEY + profileId, JSON.stringify(updated));

    if (isUuid(profileId)) {
      try {
        if (exists) {
          await withTimeout(supabase.from('profile_favorite_exercises').delete().match({ profile_id: profileId, exercise_id: exerciseId }));
        } else {
          await withTimeout(supabase.from('profile_favorite_exercises').insert({ profile_id: profileId, exercise_id: exerciseId }));
        }
      } catch {}
    }

    return !exists;
  }
}
