import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Profile, PersonalRecord, WorkoutSession, BodyWeightEntry } from '../types';
import { PersonalRecordRepository, WorkoutRepository, BodyWeightRepository } from '../repositories/WorkoutAndOtherRepositories';
import { Plus, Trophy, Flame, Sparkles, Award } from 'lucide-react';

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

  // Achievements / Stickers Collection (Section 33)
  const achievements = [
    { id: '1', title: 'Primera Sesión', icon: '🏋️', unlocked: sessions.length >= 1, desc: 'Completaste tu primer entreno' },
    { id: '2', title: 'Racha 4 Semanas', icon: '🔥', unlocked: sessions.length >= 4, desc: '4 sesiones registradas' },
    { id: '3', title: '10 Entrenamientos', icon: '💯', unlocked: sessions.length >= 10, desc: 'Constancia pura' },
    { id: '4', title: 'Primer PR', icon: '🏆', unlocked: prs.length >= 1, desc: 'Récord histórico superado' },
    { id: '5', title: '10 Toneladas', icon: '💪', unlocked: sessions.reduce((a, c) => a + c.total_volume, 0) >= 10000, desc: '+10.000 kg acumulados' },
    { id: '6', title: '4 Semanas Plan', icon: '⚡', unlocked: sessions.length >= 16, desc: 'Bloque completo fin' }
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-pink-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100 font-heading">Progreso & Logros</h1>
        <p className="text-xs text-zinc-400 mt-1 font-medium">Evolución de fuerza, e1RM e insignias conseguidas</p>
      </div>

      {/* Powerlifting Total Card */}
      <div className="comic-card-yellow p-6 space-y-4">
        <div className="flex items-center justify-between border-b-2 border-amber-500/40 pb-3">
          <div className="flex items-center gap-2 text-amber-300">
            <Trophy className="w-5 h-5" />
            <span className="text-xs font-black uppercase font-heading">Powerlifting Total (e1RM)</span>
          </div>
          <span className="text-2xl font-black text-amber-300 font-heading">{powerliftingTotal} kg</span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center pt-1">
          <div className="bg-zinc-950 p-3 rounded-xl border-2 border-zinc-800">
            <span className="text-[10px] uppercase font-black text-pink-400">Squat</span>
            <div className="text-base font-black text-zinc-100 mt-0.5">{squatPR} kg</div>
          </div>
          <div className="bg-zinc-950 p-3 rounded-xl border-2 border-zinc-800">
            <span className="text-[10px] uppercase font-black text-blue-400">Bench</span>
            <div className="text-base font-black text-zinc-100 mt-0.5">{benchPR} kg</div>
          </div>
          <div className="bg-zinc-950 p-3 rounded-xl border-2 border-zinc-800">
            <span className="text-[10px] uppercase font-black text-orange-400">Deadlift</span>
            <div className="text-base font-black text-zinc-100 mt-0.5">{deadliftPR} kg</div>
          </div>
        </div>
      </div>

      {/* ACHIEVEMENTS / STICKERS COLLECTION (Section 33) */}
      <div className="comic-card-purple p-5 space-y-4">
        <div className="flex items-center gap-2 text-purple-300 font-heading">
          <Sparkles className="w-5 h-5 text-purple-400 fill-purple-400" />
          <h3 className="text-base font-black text-zinc-100">Colección de Logros & Stickers</h3>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {achievements.map(ach => (
            <div
              key={ach.id}
              className={`p-3 rounded-2xl border-2 text-center transition-all ${
                ach.unlocked
                  ? 'bg-purple-950/80 border-purple-400 text-purple-100 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                  : 'bg-zinc-950/40 border-zinc-800 text-zinc-600 opacity-60'
              }`}
            >
              <div className="text-2xl mb-1">{ach.icon}</div>
              <div className="text-[11px] font-black font-heading line-clamp-1">{ach.title}</div>
              <div className="text-[9px] text-zinc-400 font-medium line-clamp-1 mt-0.5">{ach.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Volume Chart */}
      <div className="comic-card p-5 space-y-4">
        <h3 className="text-sm font-black text-zinc-200 font-heading">Evolución de Volumen por Sesión</h3>
        {volumeChartData.length > 0 ? (
          <div className="h-48 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volumeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} />
                <YAxis stroke="#a1a1aa" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181524', borderColor: '#ff6b8b', borderRadius: '12px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="volumen" stroke="#ff6b8b" strokeWidth={3} dot={{ fill: '#ff6b8b' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 py-6 text-center font-medium">Completa tu primer entrenamiento para ver el gráfico.</p>
        )}
      </div>

      {/* Body Weight Chart & Tracker */}
      <div className="comic-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-zinc-200 font-heading">Historial de Peso Corporal</h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={newWeight}
              onChange={e => setNewWeight(e.target.value)}
              placeholder="Ej. 82.5"
              className="w-20 bg-zinc-950 border-2 border-zinc-800 rounded-xl px-2.5 py-1 text-xs text-zinc-100 text-center font-black"
            />
            <button
              onClick={handleAddBodyWeight}
              className="comic-button bg-pink-500 text-zinc-950 p-1.5 rounded-xl font-black active:scale-95 transition cursor-pointer"
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
                <XAxis dataKey="date" stroke="#a1a1aa" fontSize={10} />
                <YAxis stroke="#a1a1aa" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181524', borderColor: '#3b82f6', borderRadius: '12px', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="peso" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 py-6 text-center font-medium">Registra tu peso corporal para seguir la tendencia.</p>
        )}
      </div>
    </div>
  );
};
