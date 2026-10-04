import React, { useState, useEffect } from 'react';
import { Play, Trophy, Flame, Dumbbell, Calendar, ChevronRight, RefreshCw } from 'lucide-react';
import { Profile, Program, ProgramDay, PersonalRecord, WorkoutSession } from '../types';
import { ProgramRepository, WorkoutRepository, PersonalRecordRepository } from '../repositories/WorkoutAndOtherRepositories';
import { ProgramGeneratorService } from '../services/ProgramGeneratorService';

interface DashboardProps {
  profile: Profile;
  onStartWorkout: (programDayId?: string) => void;
  onNavigateToProgress: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ profile, onStartWorkout, onNavigateToProgress }) => {
  const [activeProgram, setActiveProgram] = useState<Program | null>(null);
  const [programDays, setProgramDays] = useState<ProgramDay[]>([]);
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
      const days = await ProgramRepository.getProgramDays(prog.id);
      setProgramDays(days);
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

  const nextDay = programDays.length > 0
    ? programDays[(sessions.length) % programDays.length]
    : null;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto p-4 sm:p-6">
      {/* Header Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-zinc-100 flex items-center gap-2">
            Hola, {profile.name || `Perfil ${profile.slot}`} <span className="text-xl">👋</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            {profile.primary_goal || 'Powerlifting'} • {profile.experience_level || 'Intermedio'}
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs text-amber-400 font-bold">
          <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>3 semanas</span>
        </div>
      </div>

      {/* Weekly Progress Overview Card */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider font-extrabold text-zinc-400">Esta semana</span>
          <span className="text-xs text-lime-400 font-bold">{completedThisWeek} / 4 entrenamientos</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden flex gap-1 p-0.5">
          {[1, 2, 3, 4].map(num => (
            <div
              key={num}
              className={`h-full flex-1 rounded-full transition-all ${
                completedThisWeek >= num ? 'bg-lime-400' : 'bg-zinc-700/50'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Next Workout CTA Card */}
      {nextDay && (
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-lime-500/30 rounded-3xl p-6 relative overflow-hidden shadow-xl shadow-lime-500/5">
          <div className="relative z-10 space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-lime-400 bg-lime-400/10 px-2.5 py-1 rounded-full border border-lime-400/20">
                Próximo entrenamiento
              </span>
              <h2 className="text-xl font-black text-zinc-100 mt-3">{nextDay.name}</h2>
              <p className="text-xs text-zinc-400 mt-1">{nextDay.description}</p>
            </div>

            <button
              onClick={() => onStartWorkout(nextDay.id)}
              className="w-full bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-lime-400/20 text-sm cursor-pointer"
            >
              <Play className="w-5 h-5 fill-zinc-950" />
              <span>EMPEZAR ENTRENAMIENTO</span>
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* PR Highlights */}
        <button
          onClick={onNavigateToProgress}
          className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 p-4 rounded-2xl text-left space-y-2 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2 text-amber-400">
            <Trophy className="w-4 h-4" />
            <span className="text-xs font-bold text-zinc-300">Récords (PRs)</span>
          </div>
          <div className="text-xl font-extrabold text-zinc-100">{prs.length} registrados</div>
          <p className="text-[10px] text-zinc-500 font-medium">Ver gráficos de e1RM →</p>
        </button>

        {/* Weekly Volume */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-lime-400">
            <Dumbbell className="w-4 h-4" />
            <span className="text-xs font-bold text-zinc-300">Volumen semanal</span>
          </div>
          <div className="text-xl font-extrabold text-zinc-100">
            {totalWeeklyVolume.toLocaleString()} <span className="text-xs font-normal text-zinc-400">kg</span>
          </div>
          <p className="text-[10px] text-zinc-500 font-medium">Peso total levantado</p>
        </div>
      </div>
    </div>
  );
};
