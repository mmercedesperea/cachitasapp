import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Profile, PersonalRecord, WorkoutSession, BodyWeightEntry } from '../types';
import { PersonalRecordRepository, WorkoutRepository, BodyWeightRepository } from '../repositories/WorkoutAndOtherRepositories';
import { Plus, Trophy, TrendingUp } from 'lucide-react';

interface ProgressPageProps {
  profile: Profile;
}

export const ProgressPage: React.FC<ProgressPageProps> = ({ profile }) => {
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [weightEntries, setWeightEntries] = useState<BodyWeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, [profile.id]);

  const loadProgressData = async () => {
    setLoading(true);
    const records = await PersonalRecordRepository.getPRsForProfile(profile.id);
    const sess = await WorkoutRepository.getSessionsForProfile(profile.id);
    const weights = await BodyWeightRepository.getEntriesForProfile(profile.id);

    setPRs(records);
    setSessions(sess.filter(s => s.status === 'completed'));
    setWeightEntries(weights);
    setLoading(false);
  };

  const handleAddBodyWeight = async () => {
    const val = parseFloat(newWeight);
    if (!isNaN(val) && val > 0) {
      await BodyWeightRepository.addEntry(profile.id, val);
      setNewWeight('');
      const weights = await BodyWeightRepository.getEntriesForProfile(profile.id);
      setWeightEntries(weights);
    }
  };

  // Compute Powerlifting Total
  const squatPR = prs.filter(p => p.exercise?.category === 'Squat').sort((a, b) => b.estimated_1rm - a.estimated_1rm)[0]?.estimated_1rm || 0;
  const benchPR = prs.filter(p => p.exercise?.category === 'Bench').sort((a, b) => b.estimated_1rm - a.estimated_1rm)[0]?.estimated_1rm || 0;
  const deadliftPR = prs.filter(p => p.exercise?.category === 'Deadlift').sort((a, b) => b.estimated_1rm - a.estimated_1rm)[0]?.estimated_1rm || 0;
  const powerliftingTotal = Math.round((squatPR + benchPR + deadliftPR) * 10) / 10;

  // Chart Data preparation
  const volumeChartData = sessions.slice(0, 10).reverse().map(s => ({
    date: new Date(s.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    volumen: s.total_volume
  }));

  const weightChartData = weightEntries.map(w => ({
    date: new Date(w.recorded_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    peso: w.weight_kg
  }));

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 max-w-2xl mx-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">Progreso & Analítica</h1>
        <p className="text-xs text-zinc-400 mt-1">Evolución de fuerza, e1RM y peso corporal</p>
      </div>

      {/* Powerlifting Total Card */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-amber-500/30 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Trophy className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-wider">Powerlifting Total</span>
          </div>
          <span className="text-2xl font-black text-amber-400">{powerliftingTotal} kg</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Squat</span>
            <div className="text-base font-extrabold text-zinc-100 mt-0.5">{squatPR} kg</div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Bench</span>
            <div className="text-base font-extrabold text-zinc-100 mt-0.5">{benchPR} kg</div>
          </div>
          <div className="bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800">
            <span className="text-[10px] uppercase font-bold text-zinc-500">Deadlift</span>
            <div className="text-base font-extrabold text-zinc-100 mt-0.5">{deadliftPR} kg</div>
          </div>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 space-y-4">
        <h3 className="text-sm font-extrabold text-zinc-200">Evolución de Volumen por Sesión</h3>
        {volumeChartData.length > 0 ? (
          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="volumen" stroke="#a3e635" strokeWidth={3} dot={{ fill: '#a3e635' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 py-6 text-center">Completa tu primer entrenamiento para ver el gráfico.</p>
        )}
      </div>

      {/* Body Weight Chart & Tracker */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-zinc-200">Historial de Peso Corporal</h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={newWeight}
              onChange={e => setNewWeight(e.target.value)}
              placeholder="Ej. 82.5"
              className="w-20 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-100 text-center"
            />
            <button
              onClick={handleAddBodyWeight}
              className="bg-lime-400 text-zinc-950 p-1.5 rounded-xl font-bold active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {weightChartData.length > 0 ? (
          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="peso" stroke="#38bdf8" strokeWidth={3} dot={{ fill: '#38bdf8' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 py-6 text-center">Registra tu peso corporal para seguir la tendencia.</p>
        )}
      </div>
    </div>
  );
};
