import React, { useState, useEffect } from 'react';
import { Play, Trophy, Flame, Dumbbell, Calendar, ChevronRight, RefreshCw, Star, Heart } from 'lucide-react';
import { Profile, Program, ProgramWeek, ProgramDay, ProgramExercise, PersonalRecord, WorkoutSession } from '../types';
import { ProgramRepository, WorkoutRepository, PersonalRecordRepository } from '../repositories/WorkoutAndOtherRepositories';
import { ProgramGeneratorService } from '../services/ProgramGeneratorService';

interface DashboardProps {
  profile: Profile;
  onStartWorkout: (programDayId?: string) => void;
  onNavigateToProgress: () => void;
  onNavigateToPlan: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  onStartWorkout,
  onNavigateToProgress,
  onNavigateToPlan
}) => {
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [weeks, setWeeks] = useState<(ProgramWeek & { days: (ProgramDay & { exercises: ProgramExercise[] })[] })[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [profile.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    let prog = await ProgramRepository.getActiveProgramForProfile(profile.id);

    if (!prog) {
      const generated = await ProgramGeneratorService.generateProgramForProfile(
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

    const sess = await WorkoutRepository.getSessionsForProfile(profile.id);
    setSessions(sess.filter(s => s.status === 'completed'));

    const records = await PersonalRecordRepository.getPRsForProfile(profile.id);
    setPRs(records);

    setLoading(false);
  };

  const completedThisWeek = sessions.filter(s => {
    const diffDays = (new Date().getTime() - new Date(s.created_at).getTime()) / (1000 * 3600 * 24);
    return diffDays <= 7;
  }).length;

  const totalWeeklyVolume = sessions
    .filter(s => {
      const diffDays = (new Date().getTime() - new Date(s.created_at).getTime()) / (1000 * 3600 * 24);
      return diffDays <= 7;
    })
    .reduce((acc, curr) => acc + (Number(curr.total_volume) || 0), 0);

  // Active current week and next day determination
  const currentWeekIndex = Math.min(Math.floor(sessions.length / 4), 3);
  const currentWeek = weeks[currentWeekIndex] || weeks[0];
  const nextDay = currentWeek?.days?.[sessions.length % (currentWeek?.days?.length || 4)];

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-bounce text-4xl">🐱</div>
        <div className="font-black text-pink-400 text-sm tracking-wide animate-pulse">
          Cargando Dashboard Kawaii...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto p-4 sm:p-6 font-sans">
      {/* Header Greeting */}
      <div className="bg-gradient-to-r from-pink-500/20 via-purple-500/10 to-indigo-500/20 border-2 border-pink-500/40 rounded-3xl p-5 shadow-[4px_4px_0px_0px_#ec4899] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border-2 border-pink-500 flex items-center justify-center text-2xl shadow-[2px_2px_0px_0px_#000]">
            {profile.avatar || '🐱'}
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-1.5">
              ¡Hola, {profile.name || `Perfil ${profile.slot}`}! 👋
            </h1>
            <p className="text-xs text-pink-300 font-semibold mt-0.5">
              "¡Hoy vienes fuerte para romper tus marcas!" 💪
            </p>
          </div>
        </div>

        <div className="bg-amber-400 text-black font-black px-3 py-1.5 rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center gap-1 text-xs">
          <Flame className="w-4 h-4 fill-black" />
          <span>{profile.streak_weeks || 1} sem racha</span>
        </div>
      </div>

      {/* Program 4-Week Status Summary Card */}
      <div className="bg-zinc-900/90 border-2 border-zinc-800 rounded-3xl p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-400" />
            <span className="text-xs font-black uppercase tracking-wider text-zinc-300">
              Programa de 4 Semanas
            </span>
          </div>
          <button
            onClick={onNavigateToPlan}
            className="text-xs font-black text-pink-400 hover:text-pink-300 flex items-center gap-1 cursor-pointer"
          >
            <span>VER PLAN COMPLETO</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Weeks Indicator Cards */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(wNum => {
            const isCompleted = currentWeekIndex > wNum - 1;
            const isCurrent = currentWeekIndex === wNum - 1;

            return (
              <div
                key={wNum}
                onClick={onNavigateToPlan}
                className={`p-3 rounded-2xl border-2 text-center cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-pink-500/20 border-pink-500 shadow-[2px_2px_0px_0px_#ec4899]'
                    : isCompleted
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-500'
                }`}
              >
                <span className="text-[10px] font-black uppercase block">Sem {wNum}</span>
                <span className="text-xs font-bold mt-1 block">
                  {isCompleted ? '✅' : isCurrent ? '🟡 Hoy' : '🔒'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Next Workout CTA Card */}
      {nextDay && (
        <div className="bg-gradient-to-r from-purple-900/50 via-zinc-900 to-purple-950/50 border-2 border-pink-500/60 rounded-3xl p-6 relative overflow-hidden shadow-[6px_6px_0px_0px_#ec4899]">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-pink-300 bg-pink-500/20 px-3 py-1 rounded-full border border-pink-500/30">
                ⚡ Próxima Misión
              </span>
              <span className="text-xs font-bold text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                ~45 min approx
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-black text-white mt-1">{nextDay.name}</h2>
              <p className="text-xs text-zinc-300 mt-1 font-medium">{nextDay.description}</p>
            </div>

            {/* Exercise preview tags */}
            {nextDay.exercises && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {nextDay.exercises.slice(0, 4).map((pe, idx) => (
                  <span
                    key={idx}
                    className="bg-zinc-950/80 border border-zinc-800 text-zinc-300 text-[10px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1"
                  >
                    {pe.is_favorite ? '❤️' : '⭐'} {pe.exercise?.name}
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={() => onStartWorkout(nextDay.id)}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 active:translate-y-0.5 transition-all shadow-[4px_4px_0px_0px_#000] border-2 border-black text-sm cursor-pointer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>¡VAMOS A ENTRENAR! 💥</span>
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* PR Highlights */}
        <button
          onClick={onNavigateToProgress}
          className="bg-zinc-900/90 border-2 border-zinc-800 hover:border-pink-500/50 p-4 rounded-3xl text-left space-y-2 transition-all cursor-pointer shadow-[3px_3px_0px_0px_#000]"
        >
          <div className="flex items-center gap-2 text-amber-400">
            <Trophy className="w-4 h-4" />
            <span className="text-xs font-black text-zinc-300">Récords (PRs)</span>
          </div>
          <div className="text-xl font-black text-white">{prs.length} Conseguidos 🏆</div>
          <p className="text-[10px] text-pink-400 font-bold">Ver evolución en gráficos →</p>
        </button>

        {/* Weekly Volume */}
        <div className="bg-zinc-900/90 border-2 border-zinc-800 p-4 rounded-3xl space-y-2 shadow-[3px_3px_0px_0px_#000]">
          <div className="flex items-center gap-2 text-cyan-400">
            <Dumbbell className="w-4 h-4" />
            <span className="text-xs font-black text-zinc-300">Volumen Semanal</span>
          </div>
          <div className="text-xl font-black text-white">
            {totalWeeklyVolume.toLocaleString()} <span className="text-xs font-bold text-zinc-400">kg</span>
          </div>
          <p className="text-[10px] text-zinc-400 font-medium">Carga movida en 7 días</p>
        </div>
      </div>
    </div>
  );
};
