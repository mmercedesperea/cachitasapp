import React, { useState, useEffect } from 'react';
import { Play, Trophy, Flame, Dumbbell, Calendar, ChevronRight, Sparkles, Heart } from 'lucide-react';
import { Profile, Program, ProgramWeek, ProgramDay, ProgramExercise, PersonalRecord, WorkoutSession } from '../types';
import { ProgramRepository, WorkoutRepository, PersonalRecordRepository } from '../repositories/WorkoutAndOtherRepositories';
import { ExerciseRepository } from '../repositories/EquipmentAndExerciseRepository';
import { ProgramGeneratorService } from '../services/ProgramGeneratorService';
import { PET_AVATARS, CATEGORY_COLORS } from '../utils/kawaii';

interface DashboardProps {
  profile: Profile;
  onStartWorkout: (programDayId?: string) => void;
  onNavigateToPlan: () => void;
  onNavigateToProgress: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  onStartWorkout,
  onNavigateToPlan,
  onNavigateToProgress
}) => {
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [weeks, setWeeks] = useState<(ProgramWeek & { days: (ProgramDay & { exercises: ProgramExercise[] })[] })[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const pet = PET_AVATARS[profile.pet_avatar || 'cat'] || PET_AVATARS.cat;

  useEffect(() => {
    loadDashboardData();
  }, [profile.id]);

  const loadDashboardData = async () => {
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

    const sess = await WorkoutRepository.getSessionsForProfile(profile.id);
    setSessions(sess.filter(s => s.status === 'completed'));

    const records = await PersonalRecordRepository.getPRsForProfile(profile.id);
    setPRs(records);

    setLoading(false);
  };

  const completedSessionsCount = sessions.length;
  const currentWeekNumber = Math.min(4, Math.floor(completedSessionsCount / 4) + 1);
  const currentWeekObj = weeks.find(w => w.week_number === currentWeekNumber) || weeks[0];

  const nextDay = currentWeekObj?.days
    ? currentWeekObj.days[completedSessionsCount % currentWeekObj.days.length]
    : null;

  const totalVolume = sessions.reduce((acc, curr) => acc + (Number(curr.total_volume) || 0), 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-pink-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto p-4 sm:p-6">
      {/* Header Greeting with Pet Avatar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-900/60 border-2 border-purple-500 flex items-center justify-center text-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
            {pet.emoji}
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-100 font-heading flex items-center gap-2">
              ¡Hola, {profile.name || `Perfil ${profile.slot}`}! 🌸
            </h1>
            <p className="text-xs text-purple-300 font-extrabold mt-0.5">
              🔥 Semana {currentWeekNumber} / 4 • {profile.primary_goal || 'Powerlifting'}
            </p>
          </div>
        </div>

        {/* XP Badge */}
        <div className="comic-badge bg-amber-500/20 text-amber-300 border-amber-400 px-3 py-1.5 flex items-center gap-1.5 text-xs">
          <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>{profile.xp || 250} XP</span>
        </div>
      </div>

      {/* Pet Speech Bubble Quote */}
      <div className="speech-bubble text-xs font-bold text-purple-100">
        "{pet.greeting}" 💪
      </div>

      {/* NEXT WORKOUT CARD (Section 25 / 39) */}
      {nextDay && (
        <div className="comic-card-pink p-6 space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="comic-badge bg-pink-500/30 text-pink-200 border-pink-400 text-[10px] px-3 py-1">
              HOY • PRÓXIMO ENTRENAMIENTO
            </span>
            <span className="text-xs font-black text-pink-300">~ 45 min aprox</span>
          </div>

          <div>
            <h2 className="text-xl font-black text-zinc-100 font-heading mt-1">{nextDay.name}</h2>
            <p className="text-xs text-pink-200 mt-1 font-medium">{nextDay.description}</p>
          </div>

          {/* Exercise Preview List with Favorite Hearts */}
          <div className="space-y-1.5 bg-zinc-950/70 p-3 rounded-xl border border-pink-500/30">
            {nextDay.exercises?.slice(0, 4).map(pe => {
              const isFav = favoriteIds.includes(pe.exercise_id) || pe.is_favorite;
              return (
                <div key={pe.id} className="flex items-center justify-between text-xs font-bold text-zinc-200">
                  <span className="flex items-center gap-1.5">
                    {isFav ? <span className="text-pink-400 text-xs">❤️</span> : <span className="text-amber-400 text-xs">⭐</span>}
                    {pe.exercise?.name || 'Ejercicio'}
                  </span>
                  <span className="text-pink-300 text-[11px] font-extrabold">
                    {pe.target_sets} × {pe.target_reps}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => onStartWorkout(nextDay.id)}
            className="w-full comic-button bg-pink-500 hover:bg-pink-400 text-zinc-950 font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 cursor-pointer text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <Play className="w-5 h-5 fill-zinc-950" />
            <span>💥 ¡VAMOS! (EMPEZAR)</span>
          </button>
        </div>
      )}

      {/* 4 WEEKS PLAN STATUS OVERVIEW CARD (Section 25) */}
      <div className="comic-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-400" />
            <h3 className="text-base font-black text-zinc-100 font-heading">📅 TU PLAN DE 4 SEMANAS</h3>
          </div>

          <button
            onClick={onNavigateToPlan}
            className="text-xs font-black text-pink-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>VER PLAN COMPLETO</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          {[1, 2, 3, 4].map(wNum => {
            const isCompleted = currentWeekNumber > wNum;
            const isCurrent = currentWeekNumber === wNum;

            let badgeColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';
            let icon = '🔒';
            if (isCompleted) {
              badgeColor = 'bg-lime-500/20 text-lime-400 border-lime-500/50';
              icon = '✅';
            } else if (isCurrent) {
              badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-400';
              icon = '🟡';
            }

            return (
              <div
                key={wNum}
                onClick={onNavigateToPlan}
                className={`p-3 rounded-xl border-2 cursor-pointer transition ${badgeColor}`}
              >
                <div className="text-[10px] font-black uppercase">Semana {wNum}</div>
                <div className="text-base mt-1">{icon}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STATS & STREAK GRID */}
      <div className="grid grid-cols-2 gap-3">
        {/* PR Highlights */}
        <button
          onClick={onNavigateToProgress}
          className="comic-card-yellow p-4 text-left space-y-2 cursor-pointer"
        >
          <div className="flex items-center gap-2 text-amber-400">
            <Trophy className="w-4 h-4" />
            <span className="text-xs font-black text-amber-300 font-heading">🏆 TUS PRs</span>
          </div>
          <div className="text-xl font-black text-zinc-100">{prs.length} Registrados</div>
          <p className="text-[10px] text-amber-200 font-bold">Ver récords y marcas →</p>
        </button>

        {/* Total Volume */}
        <div className="comic-card-green p-4 space-y-2">
          <div className="flex items-center gap-2 text-lime-400">
            <Dumbbell className="w-4 h-4" />
            <span className="text-xs font-black text-lime-300 font-heading">🏋️ VOLUMEN</span>
          </div>
          <div className="text-xl font-black text-zinc-100">
            {totalVolume.toLocaleString()} <span className="text-xs font-normal text-lime-300">kg</span>
          </div>
          <p className="text-[10px] text-lime-200 font-bold">Total levantado</p>
        </div>
      </div>
    </div>
  );
};
