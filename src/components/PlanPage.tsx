import React, { useState, useEffect } from 'react';
import { Calendar, Play, ChevronDown, ChevronUp, RefreshCw, Heart, Sparkles, Dumbbell, Clock, Flame, ShieldAlert } from 'lucide-react';
import { Profile, Program, ProgramWeek, ProgramDay, ProgramExercise } from '../types';
import { ProgramRepository, WorkoutRepository } from '../repositories/WorkoutAndOtherRepositories';
import { ExerciseRepository } from '../repositories/EquipmentAndExerciseRepository';
import { ProgramGeneratorService } from '../services/ProgramGeneratorService';
import { PET_AVATARS, CATEGORY_COLORS } from '../utils/kawaii';

interface PlanPageProps {
  profile: Profile;
  onStartWorkout: (programDayId: string) => void;
}

export const PlanPage: React.FC<PlanPageProps> = ({ profile, onStartWorkout }) => {
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [weeks, setWeeks] = useState<(ProgramWeek & { days: (ProgramDay & { exercises: ProgramExercise[] })[] })[]>([]);
  const [openWeekNumbers, setOpenWeekNumbers] = useState<number[]>([1]); // Week 1 expanded by default
  const [openDayIds, setOpenDayIds] = useState<string[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [completedDayIds, setCompletedDayIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const pet = PET_AVATARS[profile.pet_avatar || 'cat'] || PET_AVATARS.cat;

  useEffect(() => {
    loadPlanData();
  }, [profile.id]);

  const loadPlanData = async () => {
    setLoading(true);
    let prog = await ProgramRepository.getActiveProgramForProfile(profile.id);

    if (!prog) {
      const generated = await ProgramGeneratorService.generateFourWeekPlan(
        profile.id,
        profile.primary_goal || 'Powerlifting',
        profile.experience_level || 'Intermedio'
      );
      prog = generated.program;
    }

    if (prog) {
      setActiveProgram(prog);
      const programWeeks = await ProgramRepository.getProgramWeeks(prog.id);
      setWeeks(programWeeks);
    }

    const favs = await ExerciseRepository.getFavoriteExerciseIds(profile.id);
    setFavoriteIds(favs);

    const sessions = await WorkoutRepository.getSessionsForProfile(profile.id);
    const completed = sessions
      .filter(s => s.status === 'completed' && s.program_day_id)
      .map(s => s.program_day_id as string);
    setCompletedDayIds(completed);

    setLoading(false);
  };

  const handleToggleWeek = (weekNum: number) => {
    setOpenWeekNumbers(prev =>
      prev.includes(weekNum) ? prev.filter(w => w !== weekNum) : [...prev, weekNum]
    );
  };

  const handleToggleDay = (dayId: string) => {
    setOpenDayIds(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const handleRegeneratePlan = async () => {
    setIsRegenerating(true);
    const generated = await ProgramGeneratorService.generateFourWeekPlan(
      profile.id,
      profile.primary_goal || 'Powerlifting',
      profile.experience_level || 'Intermedio'
    );
    setActiveProgram(generated.program);
    setWeeks(generated.weeks);
    const favs = await ExerciseRepository.getFavoriteExerciseIds(profile.id);
    setFavoriteIds(favs);
    setIsRegenerating(false);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-pink-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto p-4 sm:p-6">
      {/* Top Title Banner */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{pet.emoji}</span>
            <h1 className="text-2xl font-black text-zinc-100 font-heading">Plan de 4 Semanas</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            Basado en tus ejercicios favoritos y progresión de cargas
          </p>
        </div>

        <button
          onClick={handleRegeneratePlan}
          disabled={isRegenerating}
          className="bg-purple-900/40 border-2 border-purple-500 hover:bg-purple-800/50 text-purple-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
          title="Regenerar plan con tus favoritos actualizados"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
          <span>Regenerar</span>
        </button>
      </div>

      {/* Program Summary Card */}
      <div className="comic-card-purple p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="comic-badge bg-purple-500/20 text-purple-300 border-purple-400 text-[10px] px-3 py-1">
            {activeProgram?.goal || 'Powerlifting'}
          </span>
          <span className="text-xs font-bold text-purple-300">
            {favoriteIds.length} Ejercicios Favoritos en Pool
          </span>
        </div>

        <div className="speech-bubble text-xs text-purple-100 font-bold">
          {pet.greeting}
        </div>
      </div>

      {/* 4 Weeks Accordion List */}
      <div className="space-y-4">
        {weeks.map(week => {
          const isOpen = openWeekNumbers.includes(week.week_number);
          const totalWeekDays = week.days?.length || 0;
          const completedWeekDays = week.days?.filter(d => completedDayIds.includes(d.id)).length || 0;

          let borderClass = 'border-purple-500';
          if (week.week_number === 1) borderClass = 'border-pink-500';
          if (week.week_number === 2) borderClass = 'border-blue-500';
          if (week.week_number === 3) borderClass = 'border-amber-400';
          if (week.week_number === 4) borderClass = 'border-lime-400';

          return (
            <div
              key={week.id}
              className={`bg-zinc-900/90 border-3 ${borderClass} rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all`}
            >
              {/* Week Accordion Header */}
              <button
                onClick={() => handleToggleWeek(week.week_number)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-800/50 transition cursor-pointer"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-pink-400" />
                    <span className="font-black text-base text-zinc-100 font-heading">
                      SEMANA {week.week_number}
                    </span>
                    <span className="text-xs font-bold text-zinc-400">— {week.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium pl-6">
                    <span>{totalWeekDays} entrenamientos</span>
                    <span>•</span>
                    <span className="text-lime-400 font-bold">{week.focus || 'Progresión'}</span>
                    {completedWeekDays > 0 && (
                      <span className="text-amber-400 font-bold">
                        ({completedWeekDays}/{totalWeekDays} ✅)
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-2 text-zinc-400">
                  {isOpen ? <ChevronUp className="w-5 h-5 text-pink-400" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </button>

              {/* Week Content Expanded */}
              {isOpen && (
                <div className="p-4 pt-0 border-t border-zinc-800/80 space-y-4">
                  {week.days?.map(day => {
                    const isDayOpen = openDayIds.includes(day.id);
                    const isCompleted = completedDayIds.includes(day.id);

                    return (
                      <div
                        key={day.id}
                        className="bg-zinc-950/80 border-2 border-zinc-800 rounded-xl overflow-hidden mt-3"
                      >
                        {/* Day Header */}
                        <div
                          onClick={() => handleToggleDay(day.id)}
                          className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-zinc-900/60 transition"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs uppercase font-extrabold text-pink-400">
                                Día {day.day_number}
                              </span>
                              <h3 className="text-sm font-black text-zinc-100">{day.name}</h3>
                              {isCompleted && (
                                <span className="bg-lime-500/20 text-lime-400 border border-lime-500/30 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                                  COMPLETADO ✅
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400">{day.description}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-zinc-400 font-bold">
                              {day.exercises?.length || 0} ej.
                            </span>
                            {isDayOpen ? (
                              <ChevronUp className="w-4 h-4 text-zinc-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-zinc-400" />
                            )}
                          </div>
                        </div>

                        {/* Exercises List inside Day */}
                        {isDayOpen && (
                          <div className="p-3 bg-zinc-900/60 border-t border-zinc-800 space-y-3">
                            <div className="space-y-2">
                              {day.exercises?.map(pe => {
                                const isFav = favoriteIds.includes(pe.exercise_id) || pe.is_favorite;
                                const catColor = CATEGORY_COLORS[pe.exercise?.category || 'Default'];

                                return (
                                  <div
                                    key={pe.id}
                                    className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-3 flex items-center justify-between"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        {isFav ? (
                                          <span className="text-pink-400 flex items-center gap-1 text-xs font-bold bg-pink-500/10 border border-pink-500/30 px-2 py-0.5 rounded-md">
                                            ❤️ Favorito
                                          </span>
                                        ) : (
                                          <span className="text-amber-400 flex items-center gap-1 text-xs font-bold bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md">
                                            ⭐ Requerido
                                          </span>
                                        )}
                                        <span className="font-bold text-sm text-zinc-100">
                                          {pe.exercise?.name || 'Ejercicio'}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-3 text-xs text-zinc-400 font-medium">
                                        <span className={catColor.text}>
                                          {pe.target_sets} × {pe.target_reps}
                                        </span>
                                        {pe.target_rpe && (
                                          <span>@ RPE {pe.target_rpe}</span>
                                        )}
                                        {pe.rest_seconds && (
                                          <span className="flex items-center gap-0.5 text-zinc-500">
                                            <Clock className="w-3 h-3" />
                                            {pe.rest_seconds}s
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Start Workout Action Button */}
                            <button
                              onClick={() => onStartWorkout(day.id)}
                              className="w-full comic-button bg-lime-400 hover:bg-lime-300 text-zinc-950 py-3 rounded-xl flex items-center justify-center gap-2 text-xs cursor-pointer mt-2"
                            >
                              <Play className="w-4 h-4 fill-zinc-950" />
                              <span>EMPEZAR ENTRENAMIENTO</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
