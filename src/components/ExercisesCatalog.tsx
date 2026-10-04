import React, { useState, useEffect } from 'react';
import { Search, Star, Filter, Check, Dumbbell, ChevronRight } from 'lucide-react';
import { Exercise } from '../types';
import { ExerciseRepository, EquipmentRepository } from '../repositories/EquipmentAndExerciseRepository';

interface ExercisesCatalogProps {
  profileId: string;
}

export const ExercisesCatalog: React.FC<ExercisesCatalogProps> = ({ profileId }) => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [availableSlugs, setAvailableSlugs] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCatalog();
  }, [profileId]);

  const loadCatalog = async () => {
    setLoading(true);
    const all = await ExerciseRepository.getAllExercises();
    const favs = await ExerciseRepository.getFavoriteExerciseIds(profileId);
    const slugs = await EquipmentRepository.getProfileEquipmentSlugs(profileId);
    setExercises(all);
    setFavoriteIds(favs);
    setAvailableSlugs(slugs);
    setLoading(false);
  };

  const handleToggleFavorite = async (e: React.MouseEvent, exerciseId: string) => {
    e.stopPropagation();
    const isNowFav = await ExerciseRepository.toggleFavoriteExercise(profileId, exerciseId);
    setFavoriteIds(prev =>
      isNowFav ? [...prev, exerciseId] : prev.filter(id => id !== exerciseId)
    );
  };

  const categories = ['Todos', 'Favoritos', 'Squat', 'Bench', 'Deadlift', 'Upper body', 'Pierna', 'Conditioning'];

  const filteredExercises = exercises.filter(ex => {
    const matchesSearch = ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.category.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'Favoritos') {
      return favoriteIds.includes(ex.id);
    }

    if (selectedCategory !== 'Todos') {
      return ex.category === selectedCategory;
    }

    return true;
  });

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 max-w-2xl mx-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">Catálogo de Ejercicios</h1>
        <p className="text-xs text-zinc-400 mt-1">Explora la librería completa y filtra por equipamiento</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar ejercicio o grupo muscular..."
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-lime-400"
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-lime-400 text-zinc-950 shadow'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Exercise List */}
      <div className="space-y-2.5">
        {filteredExercises.map(ex => {
          const isFav = favoriteIds.includes(ex.id);
          const hasEquipment = !ex.equipment_required || ex.equipment_required.every(req => availableSlugs.includes(req));

          return (
            <div
              key={ex.id}
              onClick={() => setSelectedExercise(ex)}
              className="bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 p-4 rounded-2xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-zinc-100">{ex.name}</span>
                  {!hasEquipment && (
                    <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-md font-semibold">
                      Falta equipamiento
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-medium">
                  <span className="text-lime-400">{ex.category}</span>
                  <span>•</span>
                  <span>{ex.movement_pattern}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={e => handleToggleFavorite(e, ex.id)}
                  className="p-2 text-zinc-400 hover:text-amber-400 transition cursor-pointer"
                >
                  <Star className={`w-5 h-5 ${isFav ? 'text-amber-400 fill-amber-400' : ''}`} />
                </button>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div>
              <span className="text-[10px] uppercase font-bold text-lime-400 bg-lime-400/10 px-2.5 py-1 rounded-full border border-lime-400/20">
                {selectedExercise.category}
              </span>
              <h3 className="text-xl font-black text-zinc-100 mt-2">{selectedExercise.name}</h3>
              <p className="text-xs text-zinc-400 mt-1">{selectedExercise.description}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-bold text-zinc-300">Músculos Principales:</div>
              <div className="flex flex-wrap gap-1">
                {selectedExercise.primary_muscles?.map((m: string) => (
                  <span key={m} className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-lg text-[11px]">
                    {m}
                  </span>
                ))}
              </div>
            </div>

            {selectedExercise.instructions && (
              <div className="space-y-1.5 text-xs text-zinc-400">
                <div className="font-bold text-zinc-300">Instrucciones:</div>
                <ul className="list-disc pl-4 space-y-1">
                  {selectedExercise.instructions.map((inst: string, idx: number) => (
                    <li key={idx}>{inst}</li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => setSelectedExercise(null)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold py-3 rounded-xl text-xs mt-4"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
