import React, { useState, useEffect } from 'react';
import { Search, Heart, ChevronRight, Dumbbell, ShieldAlert, Sparkles, Trophy } from 'lucide-react';
import { Exercise, PersonalRecord } from '../types';
import { ExerciseRepository, EquipmentRepository } from '../repositories/EquipmentAndExerciseRepository';
import { PersonalRecordRepository } from '../repositories/WorkoutAndOtherRepositories';
import { CATEGORY_COLORS } from '../utils/kawaii';

interface ExercisesCatalogProps {
  profileId: string;
}

export const ExercisesCatalog: React.FC<ExercisesCatalogProps> = ({ profileId }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [availableSlugs, setAvailableSlugs] = useState<string[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('Todos');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [animatingFavId, setAnimatingFavId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCatalog();
  }, [profileId]);

  const loadCatalog = async () => {
    setLoading(true);
    const all = await ExerciseRepository.getAllExercises();
    const favs = await ExerciseRepository.getFavoriteExerciseIds(profileId);
    const slugs = await EquipmentRepository.getProfileEquipmentSlugs(profileId);
    const records = await PersonalRecordRepository.getPRsForProfile(profileId);

    setExercises(all);
    setFavoriteIds(favs);
    setAvailableSlugs(slugs);
    setPRs(records);
    setLoading(false);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, exerciseId: string) => {
    e.stopPropagation();
    setAnimatingFavId(exerciseId);
    setTimeout(() => setAnimatingFavId(null), 400);

    const isNowFav = await ExerciseRepository.toggleFavoriteExercise(profileId, exerciseId);
    setFavoriteIds(prev =>
      isNowFav ? [...prev, exerciseId] : prev.filter(id => id !== exerciseId)
    );
  };

  const filterTabs = [
    { id: 'Todos', label: 'Todos' },
    { id: 'Favoritos', label: '❤️ Favoritos' },
    { id: 'Fuerza', label: '🏋️ Fuerza' },
    { id: 'Hipertrofia', label: '💪 Hipertrofia' },
    { id: 'Conditioning', label: '⚡ Conditioning' },
    { id: 'Squat', label: '🦵 Squat' },
    { id: 'Bench', label: '💪 Bench' },
    { id: 'Deadlift', label: '🔥 Deadlift' },
  ];

  const filteredExercises = exercises.filter(ex => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      ex.name.toLowerCase().includes(searchLower) ||
      ex.category.toLowerCase().includes(searchLower) ||
      ex.movement_pattern.toLowerCase().includes(searchLower) ||
      (ex.primary_muscles && ex.primary_muscles.some(m => m.toLowerCase().includes(searchLower)));

    if (!matchesSearch) return false;

    if (selectedFilter === 'Favoritos') {
      return favoriteIds.includes(ex.id);
    }
    if (selectedFilter === 'Fuerza') {
      return ex.is_compound || ex.is_powerlifting;
    }
    if (selectedFilter === 'Hipertrofia') {
      return !ex.is_powerlifting && !ex.is_conditioning;
    }
    if (selectedFilter === 'Conditioning') {
      return ex.is_conditioning;
    }
    if (['Squat', 'Bench', 'Deadlift'].includes(selectedFilter)) {
      return ex.category === selectedFilter;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-pink-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28 max-w-2xl mx-auto p-4 sm:p-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black text-zinc-100 font-heading">Catálogo de Ejercicios</h1>
        <p className="text-xs text-zinc-400 mt-1 font-medium">
          Selecciona tus ejercicios favoritos (❤️) para nutrir tu plan de 4 semanas
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-pink-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar ejercicio, músculo o patrón (ej. Pecho, Squat)..."
          className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-2xl pl-10 pr-4 py-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-pink-500 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        />
      </div>

      {/* Filter Tabs Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {filterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedFilter(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer border-2 ${
              selectedFilter === tab.id
                ? 'bg-pink-500 text-zinc-950 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Exercises List */}
      <div className="space-y-3">
        {filteredExercises.length === 0 ? (
          <div className="text-center py-12 bg-zinc-900/60 border-2 border-dashed border-zinc-800 rounded-2xl p-6">
            <p className="text-sm font-bold text-zinc-400">No se encontraron ejercicios.</p>
            <p className="text-xs text-zinc-500 mt-1">Prueba a limpiar la búsqueda o cambiar de filtro.</p>
          </div>
        ) : (
          filteredExercises.map(ex => {
            const isFav = favoriteIds.includes(ex.id);
            const hasEquipment =
              !ex.equipment_required || ex.equipment_required.every(req => availableSlugs.includes(req));
            const catStyle = CATEGORY_COLORS[ex.category] || CATEGORY_COLORS.Default;

            return (
              <div
                key={ex.id}
                onClick={() => setSelectedExercise(ex)}
                className={`comic-card p-4 flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]`}
              >
                <div className="space-y-1.5 max-w-[70%]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-zinc-100 font-heading">{ex.name}</span>
                    {!hasEquipment && (
                      <span className="text-[10px] bg-red-950/80 text-red-400 border border-red-500/40 px-2 py-0.5 rounded-full font-extrabold">
                        Falta equipamiento
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <span className={`comic-badge text-[9px] px-2 py-0.5 ${catStyle.badge}`}>
                      {ex.category}
                    </span>
                    <span className="text-zinc-500">•</span>
                    <span className="text-zinc-400">{ex.movement_pattern}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={e => handleToggleFavorite(e, ex.id)}
                    className={`p-2.5 rounded-xl border-2 transition cursor-pointer active:scale-90 ${
                      isFav
                        ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                    } ${animatingFavId === ex.id ? 'animate-heart-pop' : ''}`}
                    title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  >
                    <Heart className={`w-5 h-5 ${isFav ? 'fill-pink-500 text-pink-500' : ''}`} />
                  </button>

                  <ChevronRight className="w-5 h-5 text-zinc-600" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Exercise Detail Modal (/exercises/:id) */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="comic-card-purple max-w-sm w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="comic-badge text-[10px] bg-purple-500/30 text-purple-200 border-purple-400 px-3 py-1">
                  {selectedExercise.category}
                </span>
                <h3 className="text-xl font-black text-zinc-100 font-heading mt-2">
                  {selectedExercise.name}
                </h3>
              </div>

              <button
                onClick={e => handleToggleFavorite(e, selectedExercise.id)}
                className={`p-2 rounded-xl border-2 cursor-pointer ${
                  favoriteIds.includes(selectedExercise.id)
                    ? 'bg-pink-500/20 border-pink-500 text-pink-400'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                }`}
              >
                <Heart className={`w-5 h-5 ${favoriteIds.includes(selectedExercise.id) ? 'fill-pink-500 text-pink-500' : ''}`} />
              </button>
            </div>

            <p className="text-xs text-purple-200 font-medium">{selectedExercise.description}</p>

            {/* Muscle Groups */}
            <div className="space-y-1 text-xs">
              <span className="font-extrabold text-purple-300">Músculos Principales:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedExercise.primary_muscles?.map(m => (
                  <span key={m} className="bg-purple-950 border border-purple-500/30 text-purple-200 text-[11px] font-bold px-2.5 py-0.5 rounded-lg">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {/* Instructions */}
            {selectedExercise.instructions && (
              <div className="space-y-1.5 text-xs text-purple-200">
                <span className="font-extrabold text-purple-300">Cómo realizarlo:</span>
                <ul className="list-disc pl-4 space-y-1">
                  {selectedExercise.instructions.map((inst: string, idx: number) => (
                    <li key={idx}>{inst}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Progress Stats */}
            <div className="bg-zinc-950/80 border-2 border-zinc-800 p-3.5 rounded-2xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Trophy className="w-4 h-4" />
                <span>Tu Progreso Registrado</span>
              </div>
              {prs.find(p => p.exercise_id === selectedExercise.id) ? (
                <div className="grid grid-cols-2 gap-2 text-xs font-bold text-zinc-200 pt-1">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Mejor e1RM</span>
                    <span className="text-sm font-black text-amber-400">
                      {prs.find(p => p.exercise_id === selectedExercise.id)?.estimated_1rm} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase block">Mejor Serie</span>
                    <span className="text-sm font-black text-lime-400">
                      {prs.find(p => p.exercise_id === selectedExercise.id)?.weight} kg × {prs.find(p => p.exercise_id === selectedExercise.id)?.reps}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-500">Aún no has registrado PRs en este ejercicio.</p>
              )}
            </div>

            <button
              onClick={() => setSelectedExercise(null)}
              className="w-full comic-button bg-purple-500 hover:bg-purple-400 text-zinc-950 py-3 rounded-xl text-xs cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
