import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, ChevronUp, Play, Heart, Sparkles, RefreshCw, CheckCircle2, Lock, Flame, Dumbbell } from 'lucide-react';
import { Profile, Program, ProgramWeek, ProgramDay, ProgramExercise } from '../types';
import { ProgramRepository, WorkoutRepository } from '../repositories/WorkoutAndOtherRepositories';
import { ProgramGeneratorService } from '../services/ProgramGeneratorService';
import { ExerciseRepository } from '../repositories/EquipmentAndExerciseRepository';

interface PlanPageProps {
  profile: Profile;
  onStartWorkout: (programDayId: string) => void;
}

export const PlanPage: React.FC<PlanPageProps> = ({ profile, onStartWorkout }) => {
  const [program, setProgram] = useState<Program | null>(null);
  const [weeks, setWeeks] = useState<(ProgramWeek & { days: (ProgramDay & { exercises: ProgramExercise[] })[] })[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({ 1: true });
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadPlan();
  }, [profile.id]);

  const loadPlan = async () => {
    setLoading(true);
    const activeProg = await ProgramRepository.getActiveProgramForProfile(profile.id);
    const favs = await ExerciseRepository.getFavoriteExerciseIds(profile.id);
    setFavoriteIds(favs);

    if (activeProg) {
      setProgram(activeProg);
      const programWeeks = await ProgramRepository.getProgramWeeks(activeProg.id);
      setWeeks(programWeeks);
    } else {
      // Auto-generate program if none exists
      await handleGeneratePlan();
    }
    setLoading(false);
  };

  const handleGeneratePlan = async () => {
    setRegenerating(true);
    try {
      const { program: newProg, weeks: newWeeks } = await ProgramGeneratorService.generateProgramForProfile(
        profile.id,
        profile.primary_goal || 'Powerlifting',
        profile.experience_level || 'Intermedio'
      );
      setProgram(newProg);
      setWeeks(newWeeks);
    } catch (e) {
      console.error('Error generating plan:', e);
    } finally {
      setRegenerating(false);
    }
  };

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks(prev => ({ ...prev, [weekNum]: !prev[weekNum] }));
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-bounce text-4xl">🐱</div>
        <div className="font-black text-pink-400 text-sm tracking-wide animate-pulse">
          Preparando tu Plan de 4 Semanas...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto p-4 sm:p-6 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 rounded-3xl p-6 text-white border-2 border-black shadow-[6px_6px_0px_0px_#000] relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <span className="text-[10px] uppercase font-black bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 tracking-wider text-pink-200">
              📅 PLAN DE 4 SEMANAS
            </span>
            <h1 className="text-2xl font-black mt-2 flex items-center gap-2">
              Tu Programa Progresivo ✨
            </h1>
            <p className="text-xs text-pink-100 font-medium mt-1">
              Basado prioritariamente en tus ejercicios ❤️ Favoritos y equipamiento.
            </p>
          </div>
          <button
            onClick={handleGeneratePlan}
            disabled={regenerating}
            className="p-3 bg-white/10 hover:bg-white/20 border border-white/30 rounded-2xl cursor-pointer transition-all active:scale-95 text-white"
            title="Regenerar plan con favoritos actuales"
          >
            <RefreshCw className={`w-5 h-5 ${regenerating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Weeks Accordion List */}
      <div className="space-y-4">
        {weeks.map(week => {
          const isExpanded = !!expandedWeeks[week.week_number];

          let weekBadgeColor = 'bg-pink-500 text-white';
          if (week.week_number === 2) weekBadgeColor = 'bg-cyan-500 text-black';
          if (week.week_number === 3) weekBadgeColor = 'bg-amber-400 text-black';
          if (week.week_number === 4) weekBadgeColor = 'bg-emerald-400 text-black';

          return (
            <div
              key={week.id}
              className="bg-zinc-900/90 border-2 border-zinc-800 rounded-3xl shadow-[4px_4px_0px_0px_#000] overflow-hidden transition-all"
            >
              {/* Week Accordion Header */}
              <button
                onClick={() => toggleWeek(week.week_number)}
                className="w-full p-5 flex items-center justify-between cursor-pointer hover:bg-zinc-800/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-black px-3 py-1.5 rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_#000] ${weekBadgeColor}`}>
                    SEMANA {week.week_number}
                  </span>
                  <div>
                    <h3 className="font-black text-base text-white flex items-center gap-2">
                      {week.name || `Semana ${week.week_number}`}
                    </h3>
                    {week.focus && (
                      <p className="text-xs text-pink-300 font-semibold mt-0.5">
                        🎯 {week.focus}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-zinc-400">
                  <span className="text-xs font-bold text-zinc-500">
                    {week.days?.length || 4} sesiones
                  </span>
                  {isExpanded ? <ChevronUp className="w-5 h-5 text-pink-400" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {/* Week Accordion Content */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 space-y-4 border-t border-zinc-800/80">
                  {week.days?.map(day => (
                    <div
                      key={day.id}
                      className="bg-zinc-950/80 border-2 border-zinc-800/90 rounded-2xl p-4 space-y-3 shadow-[3px_3px_0px_0px_#000]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-black text-sm text-pink-400 flex items-center gap-1.5">
                            {day.name}
                          </h4>
                          {day.description && (
                            <p className="text-[11px] text-zinc-400 font-medium">
                              {day.description}
                            </p>
                          )}
                        </div>

                        {/* Direct Workout Start Button */}
                        <button
                          onClick={() => onStartWorkout(day.id)}
                          className="bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-black" />
                          <span>EMPEZAR</span>
                        </button>
                      </div>

                      {/* Exercises List for Day */}
                      <div className="space-y-2 pt-1">
                        {day.exercises?.map((pe, idx) => {
                          const isFav = pe.is_favorite || (pe.exercise_id && favoriteIds.includes(pe.exercise_id));

                          return (
                            <div
                              key={pe.id || idx}
                              className="bg-zinc-900/90 border border-zinc-800 p-2.5 rounded-xl flex items-center justify-between text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-black text-pink-400 text-[11px]">
                                  {isFav ? '❤️' : '⭐'}
                                </span>
                                <div>
                                  <span className="font-bold text-zinc-100">
                                    {pe.exercise?.name || 'Ejercicio'}
                                  </span>
                                  {pe.target_rpe && (
                                    <span className="ml-2 text-[10px] text-purple-300 font-semibold">
                                      @ RPE {pe.target_rpe}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="font-black text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20 text-[11px]">
                                {pe.target_sets} × {pe.target_reps}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
