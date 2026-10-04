import React, { useState, useEffect } from 'react';
import { Search, Heart, Sparkles, Trophy, Dumbbell, ChevronRight, Zap, Flame, Star, ShieldCheck } from 'lucide-react';
import { Exercise, PersonalRecord, WorkoutSession } from '../types';
import { ExerciseRepository, EquipmentRepository } from '../repositories/EquipmentAndExerciseRepository';
import { PersonalRecordRepository, WorkoutRepository } from '../repositories/WorkoutAndOtherRepositories';

interface ExercisesCatalogProps {
  profileId: string;
}

export const ExercisesCatalog: React.FC<ExercisesCatalogProps> = ({ profileId }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [availableSlugs, setAvailableSlugs] = useState<string[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [history, setHistory] = useState<WorkoutSession[]>([]);
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('Todos');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [animatingHeartId, setAnimatingHeartId] = useState<string | null>(null);

  useEffect(() => {
    loadCatalog();
  }, [profileId]);

  const loadCatalog = async () => {
    setLoading(true);
    const [allEx, favs, slugs, userPrs, userHistory] = await Promise.all([
      ExerciseRepository.getAllExercises(),
      ExerciseRepository.getFavoriteExerciseIds(profileId),
      EquipmentRepository.getProfileEquipmentSlugs(profileId),
      PersonalRecordRepository.getPRsForProfile(profileId),
      WorkoutRepository.getSessionsForProfile(profileId)
    ]);

    setExercises(allEx);
    setFavoriteIds(favs);
    setAvailableSlugs(slugs);
    setPrs(userPrs);
    setHistory(userHistory);
    setLoading(false);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, exerciseId: string) => {
    e.stopPropagation();
    setAnimatingHeartId(exerciseId);
    setTimeout(() => setAnimatingHeartId(null), 400);

    const isNowFav = await ExerciseRepository.toggleFavoriteExercise(profileId, exerciseId);
    setFavoriteIds(prev =>
      isNowFav ? [...prev, exerciseId] : prev.filter(id => id !== exerciseId)
    );
  };

  const filters = [
    { label: 'Todos', icon: '✨' },
    { label: '❤️ Favoritos', icon: '❤️' },
    { label: 'Squat', icon: '🦵' },
    { label: 'Bench', icon: '🏋️' },
    { label: 'Deadlift', icon: '💥' },
    { label: 'Upper body', icon: '💪' },
    { label: 'Conditioning', icon: '⚡' }
  ];

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch =
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.category.toLowerCase().includes(search.toLowerCase()) ||
      ex.movement_pattern.toLowerCase().includes(search.toLowerCase()) ||
      ex.primary_muscles.some(m => m.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedFilter === '❤️ Favoritos') {
      return favoriteIds.includes(ex.id);
    }

    if (selectedFilter !== 'Todos') {
      return ex.category === selectedFilter || (selectedFilter === 'Conditioning' && ex.is_conditioning);
    }

    return true;
  });

  const getExerciseStats = (exId: string) => {
    const pr = prs.find(p => p.exercise_id === exId);
    let bestWeight = pr ? pr.weight : null;
    let estimated1rm = pr ? pr.estimated_1rm : null;
    let lastSessionDesc = 'Sin registros aún';

    for (const session of history) {
      if (session.exercises) {
        const foundEx = session.exercises.find(e => e.exercise_id === exId);
        if (foundEx && foundEx.sets && foundEx.sets.length > 0) {
          const completedSet = foundEx.sets.find(s => s.completed && s.actual_weight);
          if (completedSet) {
            lastSessionDesc = `${completedSet.actual_weight} kg × ${completedSet.actual_reps || 0} reps`;
            break;
          }
        }
      }
    }

    return { bestWeight, estimated1rm, lastSessionDesc };
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-bounce text-4xl">🐱</div>
        <div className="font-black text-amber-400 text-sm tracking-wide animate-pulse">
          Cargando catálogo kawaii...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-28 max-w-2xl mx-auto p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-purple-950/40 border-2 border-purple-500/40 rounded-3xl p-5 shadow-[4px_4px_0px_0px_#9333ea]">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-pink-400 bg-pink-500/20 px-2.5 py-1 rounded-full border border-pink-500/30">
              📚 Catálogo Kawaii
            </span>
            <h1 className="text-2xl font-black text-white mt-1.5 flex items-center gap-2">
              Librería de Ejercicios ✨
            </h1>
            <p className="text-xs text-purple-200 mt-1 font-medium">
              Marca tus ❤️ Favoritos para alimentar el generador de programas.
            </p>
          </div>
          <div className="text-4xl">🐱</div>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-5 h-5 text-purple-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Buscar ejercicio, músculo o patrón..."
          className="w-full bg-zinc-900/90 border-2 border-zinc-700/80 rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-pink-400 focus:shadow-[3px_3px_0px_0px_#ec4899] transition-all"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {filters.map(f => (
          <button
            key={f.label}
            onClick={() => setSelectedFilter(f.label)}
            className={`px-3.5 py-2 rounded-2xl text-xs font-black whitespace-nowrap border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedFilter === f.label
                ? 'bg-pink-500 border-black text-white shadow-[3px_3px_0px_0px_#000] translate-y-[-2px]'
                : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
            }`}
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Exercise Count */}
      <div className="flex items-center justify-between px-1 text-xs font-bold text-zinc-400">
        <span>Mostrando {filteredExercises.length} ejercicios</span>
        <span className="text-pink-400">❤️ {favoriteIds.length} favoritos marcados</span>
      </div>

      {/* Exercise List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredExercises.map(ex => {
          const isFav = favoriteIds.includes(ex.id);
          const hasEquipment = !ex.equipment_required || ex.equipment_required.every(req => availableSlugs.includes(req));
          const isAnimating = animatingHeartId === ex.id;

          let catBadgeColor = 'bg-purple-500/20 border-purple-500/40 text-purple-300';
          if (ex.category === 'Squat') catBadgeColor = 'bg-pink-500/20 border-pink-500/40 text-pink-300';
          if (ex.category === 'Bench') catBadgeColor = 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300';
          if (ex.category === 'Deadlift') catBadgeColor = 'bg-amber-500/20 border-amber-500/40 text-amber-300';
          if (ex.category === 'Conditioning') catBadgeColor = 'bg-lime-500/20 border-lime-500/40 text-lime-300';

          return (
            <div
              key={ex.id}
              onClick={() => setSelectedExercise(ex)}
              className={`group bg-zinc-900/90 border-2 rounded-2xl p-4 cursor-pointer transition-all hover:translate-y-[-2px] relative flex flex-col justify-between ${
                isFav
                  ? 'border-pink-500/60 shadow-[4px_4px_0px_0px_#ec4899]'
                  : 'border-zinc-800/90 hover:border-zinc-700 shadow-[3px_3px_0px_0px_#000]'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border ${catBadgeColor}`}>
                    {ex.category}
                  </span>
                  <button
                    onClick={e => handleToggleFavorite(e, ex.id)}
                    className="p-1.5 text-zinc-400 hover:text-pink-400 transition cursor-pointer"
                    title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                  >
                    <Heart
                      className={`w-5 h-5 transition-transform duration-200 ${
                        isFav ? 'text-pink-500 fill-pink-500' : 'text-zinc-500'
                      } ${isAnimating ? 'scale-150' : 'scale-100'}`}
                    />
                  </button>
                </div>

                <h3 className="font-black text-sm text-white group-hover:text-pink-300 transition-colors flex items-center gap-1.5">
                  {isFav && <span className="text-xs">❤️</span>}
                  {ex.name}
                </h3>

                <p className="text-[11px] font-semibold text-zinc-400 mt-1 line-clamp-2">
                  {ex.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-bold">
                <div className="flex items-center gap-1.5">
                  {!hasEquipment ? (
                    <span className="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20 text-[10px]">
                      ⚠️ Falta equipamiento
                    </span>
                  ) : (
                    <span className="text-zinc-500">{ex.movement_pattern}</span>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Exercise Detail Modal */}
      {selectedExercise && (() => {
        const isFav = favoriteIds.includes(selectedExercise.id);
        const stats = getExerciseStats(selectedExercise.id);

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border-2 border-pink-500 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-[8px_8px_0px_0px_#ec4899] animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-black text-pink-400 bg-pink-500/20 px-2.5 py-1 rounded-full border border-pink-500/30">
                    {selectedExercise.category} · {selectedExercise.movement_pattern}
                  </span>
                  <h2 className="text-2xl font-black text-white mt-2 flex items-center gap-2">
                    {selectedExercise.name}
                  </h2>
                </div>
                <button
                  onClick={e => handleToggleFavorite(e, selectedExercise.id)}
                  className="p-2 bg-pink-500/10 border border-pink-500/30 rounded-2xl hover:bg-pink-500/20 cursor-pointer"
                >
                  <Heart className={`w-6 h-6 ${isFav ? 'text-pink-500 fill-pink-500' : 'text-zinc-400'}`} />
                </button>
              </div>

              <p className="text-xs text-zinc-300 font-medium bg-zinc-800/80 p-3 rounded-2xl border border-zinc-700/80">
                {selectedExercise.description}
              </p>

              {/* Stats Section */}
              <div className="bg-gradient-to-r from-purple-950/60 to-zinc-900 border border-purple-500/30 rounded-2xl p-4 space-y-2.5">
                <div className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4" />
                  <span>Tu Progreso e Historial</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-zinc-950/80 p-2 rounded-xl border border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 block">Mejor Peso</span>
                    <span className="text-xs font-black text-white">
                      {stats.bestWeight ? `${stats.bestWeight} kg` : '-'}
                    </span>
                  </div>
                  <div className="bg-zinc-950/80 p-2 rounded-xl border border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 block">e1RM Est.</span>
                    <span className="text-xs font-black text-amber-400">
                      {stats.estimated1rm ? `${stats.estimated1rm} kg` : '-'}
                    </span>
                  </div>
                  <div className="bg-zinc-950/80 p-2 rounded-xl border border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 block">Última Sesión</span>
                    <span className="text-[10px] font-bold text-pink-300 block truncate">
                      {stats.lastSessionDesc}
                    </span>
                  </div>
                </div>
              </div>

              {/* Muscles */}
              <div className="space-y-1.5">
                <div className="text-xs font-black text-zinc-300">Músculos implicados:</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedExercise.primary_muscles?.map((m: string) => (
                    <span key={m} className="bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[10px] font-bold px-2.5 py-1 rounded-xl">
                      💪 {m}
                    </span>
                  ))}
                  {selectedExercise.secondary_muscles?.map((m: string) => (
                    <span key={m} className="bg-zinc-800 text-zinc-400 border border-zinc-700 text-[10px] font-semibold px-2.5 py-1 rounded-xl">
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              {selectedExercise.instructions && (
                <div className="space-y-1.5 text-xs text-zinc-300">
                  <div className="font-black text-white">Cómo realizarlo:</div>
                  <ul className="space-y-1.5 text-zinc-400 font-medium">
                    {selectedExercise.instructions.map((inst: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 bg-zinc-950/60 p-2 rounded-xl border border-zinc-800">
                        <span className="text-pink-400 font-black">{idx + 1}.</span>
                        <span>{inst}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={() => setSelectedExercise(null)}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-3 rounded-2xl text-xs shadow-[4px_4px_0px_0px_#000] border-2 border-black transition-all cursor-pointer"
              >
                ¡ENTENDIDO! ✨
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
