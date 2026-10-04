import React, { useState, useEffect, useRef } from 'react';
import { Check, Plus, Minus, Timer, Disc, Award, ChevronLeft, Sparkles, Trophy, Heart } from 'lucide-react';
import { Profile, WorkoutSession, PersonalRecord, Exercise } from '../types';
import { WorkoutRepository, ProgramRepository, PersonalRecordRepository } from '../repositories/WorkoutAndOtherRepositories';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { ExerciseRepository } from '../repositories/EquipmentAndExerciseRepository';
import { ProgressionService } from '../services/ProgressionService';
import { PersonalRecordService } from '../services/PersonalRecordService';
import { PlateCalculatorService, PlateBreakdown } from '../services/PlateCalculatorService';
import { PET_AVATARS, CATEGORY_COLORS, getRandomMotivationalMessage } from '../utils/kawaii';

interface WorkoutPageProps {
  profile: Profile;
  programDayId?: string;
  onFinishWorkout: () => void;
  onBack: () => void;
}

export const WorkoutPage: React.FC<WorkoutPageProps> = ({
  profile,
  programDayId,
  onFinishWorkout,
  onBack,
}) => {
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeRestSeconds, setActiveRestSeconds] = useState<number | null>(null);
  const [isRestTimerRunning, setIsRestTimerRunning] = useState(false);
  const [newPRCelebration, setNewPRCelebration] = useState<string | null>(null);
  const [selectedBarbellWeight, setSelectedBarbellWeight] = useState<number | null>(null);
  const [plateBreakdown, setPlateBreakdown] = useState<PlateBreakdown | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCompletedSummaryOpen, setIsCompletedSummaryOpen] = useState(false);
  const [newPRCount, setNewPRCount] = useState(0);

  const timerRef = useRef<any>(null);
  const pet = PET_AVATARS[profile.pet_avatar || 'cat'] || PET_AVATARS.cat;

  useEffect(() => {
    initWorkoutSession();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [profile.id, programDayId]);

  useEffect(() => {
    if (isRestTimerRunning && activeRestSeconds !== null && activeRestSeconds > 0) {
      timerRef.current = setInterval(() => {
        setActiveRestSeconds(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else if (activeRestSeconds === 0) {
      setIsRestTimerRunning(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRestTimerRunning, activeRestSeconds]);

  const initWorkoutSession = async () => {
    setLoading(true);
    let active = await WorkoutRepository.getActiveSession(profile.id);

    if (!active) {
      let exercisesToLoad: { exercise: Exercise; targetSets: number; targetReps: number; targetRpe: number }[] = [];

      if (programDayId) {
        const program = await ProgramRepository.getActiveProgramForProfile(profile.id);
        if (program) {
          const days = await ProgramRepository.getProgramDays(program.id);
          const currentDay = days.find(d => d.id === programDayId);

          if (currentDay && currentDay.exercises) {
            exercisesToLoad = currentDay.exercises.map(pe => ({
              exercise: pe.exercise!,
              targetSets: pe.target_sets || 4,
              targetReps: pe.target_reps || 6,
              targetRpe: pe.target_rpe || 8
            }));
          }
        }
      }

      if (exercisesToLoad.length === 0) {
        const allExercises = await ExerciseRepository.getAllExercises();
        const defaultSet = allExercises.filter(e => e.is_powerlifting || e.is_compound).slice(0, 4);
        exercisesToLoad = defaultSet.map(e => ({
          exercise: e,
          targetSets: 4,
          targetReps: 5,
          targetRpe: 8
        }));
      }

      const sessionId = `session-${profile.id}-${Date.now()}`;
      const newSession: WorkoutSession = {
        id: sessionId,
        profile_id: profile.id,
        program_day_id: programDayId || null,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        total_volume: 0,
        created_at: new Date().toISOString(),
        exercises: exercisesToLoad.map((item, idx) => {
          const weId = `we-${sessionId}-${idx}`;
          const defaultWeight = item.exercise.category === 'Squat' ? 80 : item.exercise.category === 'Bench' ? 60 : 100;

          return {
            id: weId,
            workout_session_id: sessionId,
            exercise_id: item.exercise.id,
            exercise_order: idx + 1,
            exercise: item.exercise,
            sets: Array.from({ length: item.targetSets }).map((_, setIdx) => ({
              id: `ws-${weId}-${setIdx + 1}`,
              workout_exercise_id: weId,
              set_number: setIdx + 1,
              target_weight: defaultWeight,
              actual_weight: defaultWeight,
              target_reps: item.targetReps,
              actual_reps: item.targetReps,
              target_rpe: item.targetRpe,
              actual_rpe: item.targetRpe,
              completed: false,
            }))
          };
        })
      };

      await WorkoutRepository.saveWorkoutSession(newSession);
      active = newSession;
    }

    setSession(active);
    setLoading(false);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2000);
  };

  const handleToggleSetComplete = async (weIndex: number, setIndex: number) => {
    if (!session || !session.exercises) return;

    const updatedSession = { ...session };
    const exercises = updatedSession.exercises || [];
    const targetSet = exercises[weIndex]?.sets?.[setIndex];
    if (!targetSet) return;

    const newCompletedState = !targetSet.completed;
    targetSet.completed = newCompletedState;
    targetSet.completed_at = newCompletedState ? new Date().toISOString() : undefined;

    // Recalculate Session Volume
    let totalVol = 0;
    exercises.forEach(we => {
      we.sets?.forEach(st => {
        if (st.completed && st.actual_weight && st.actual_reps) {
          totalVol += ProgressionService.calculateVolume(st.actual_weight, st.actual_reps);
        }
      });
    });
    updatedSession.total_volume = totalVol;

    setSession(updatedSession);
    await WorkoutRepository.saveWorkoutSession(updatedSession);

    if (newCompletedState) {
      showToast(getRandomMotivationalMessage('set'));
      setActiveRestSeconds(120);
      setIsRestTimerRunning(true);

      const exerciseId = exercises[weIndex].exercise_id;
      const existingPRs = await PersonalRecordRepository.getPRsForProfile(profile.id);
      const exercisePRs = existingPRs.filter(p => p.exercise_id === exerciseId);

      const prResult = PersonalRecordService.checkNewPR(
        targetSet.actual_weight || 0,
        targetSet.actual_reps || 0,
        exercisePRs
      );

      if (prResult.isNewPR && prResult.message) {
        setNewPRCelebration(prResult.message);
        setNewPRCount(prev => prev + 1);
        const newPR: PersonalRecord = {
          id: `pr-${profile.id}-${Date.now()}`,
          profile_id: profile.id,
          exercise_id: exerciseId,
          record_type: 'e1RM',
          weight: targetSet.actual_weight || 0,
          reps: targetSet.actual_reps || 0,
          estimated_1rm: prResult.newValue || 0,
          achieved_at: new Date().toISOString()
        };
        await PersonalRecordRepository.savePR(newPR);
      }
    }
  };

  const handleUpdateSetValue = (
    weIndex: number,
    setIndex: number,
    field: 'actual_weight' | 'actual_reps' | 'actual_rpe',
    delta: number
  ) => {
    if (!session || !session.exercises) return;

    const updatedSession = { ...session };
    const exercises = updatedSession.exercises || [];
    const setItem = exercises[weIndex]?.sets?.[setIndex];
    if (!setItem) return;

    const currentVal = (setItem[field] as number) || 0;
    const newVal = Math.max(0, Math.round((currentVal + delta) * 10) / 10);

    setItem[field] = newVal;
    setSession(updatedSession);
    WorkoutRepository.saveWorkoutSession(updatedSession);
  };

  const handleOpenPlateCalculator = (targetWeight: number) => {
    const breakdown = PlateCalculatorService.calculatePlates(targetWeight, 20);
    setPlateBreakdown(breakdown);
    setSelectedBarbellWeight(targetWeight);
  };

  const handleCompleteWorkoutTrigger = async () => {
    if (!session) return;
    const durationSeconds = Math.round(
      (new Date().getTime() - new Date(session.started_at).getTime()) / 1000
    );

    const completedSession: WorkoutSession = {
      ...session,
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_seconds: durationSeconds
    };
    await WorkoutRepository.saveWorkoutSession(completedSession);

    // Update Profile XP (+250 XP for workout)
    const newXp = (profile.xp || 0) + 250;
    await ProfileRepository.updateProfile({ id: profile.id, xp: newXp });

    setIsCompletedSummaryOpen(true);
  };

  if (loading || !session) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-pink-400"></div>
      </div>
    );
  }

  const completedSetsCount = session.exercises?.reduce(
    (acc, we) => acc + (we.sets?.filter(s => s.completed).length || 0),
    0
  ) || 0;

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto p-4 sm:p-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-pink-500 border-2 border-black text-zinc-950 font-black px-4 py-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 text-xs animate-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}

      {/* Top Bar Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 bg-zinc-900 border-2 border-zinc-800 rounded-2xl text-zinc-400 hover:text-zinc-100 cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black text-purple-300 font-heading">
            <span>{pet.emoji}</span>
            <span>Sesión en Curso</span>
          </div>
          <p className="text-[11px] text-zinc-400 font-bold">
            Volumen: <span className="text-pink-400">{session.total_volume} kg</span>
          </p>
        </div>

        <button
          onClick={handleCompleteWorkoutTrigger}
          className="comic-button bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs px-4 py-2 rounded-xl cursor-pointer"
        >
          Finalizar
        </button>
      </div>

      {/* Exercises & Sets List */}
      <div className="space-y-6">
        {session.exercises?.map((we, weIndex) => {
          const catStyle = CATEGORY_COLORS[we.exercise?.category || 'Default'];

          return (
            <div key={we.id} className="comic-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`comic-badge text-[9px] px-2 py-0.5 ${catStyle.badge}`}>
                      {we.exercise?.category}
                    </span>
                    <h3 className="text-base font-black text-zinc-100 font-heading">
                      {we.exercise?.name}
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-medium mt-0.5">
                    Objetivo: {we.sets?.length || 4} series × {we.sets?.[0]?.target_reps || 5} reps @ {we.sets?.[0]?.target_weight || 80} kg
                  </p>
                </div>

                {we.exercise?.equipment_required?.includes('barra-olimpica') && (
                  <button
                    onClick={() => handleOpenPlateCalculator(we.sets?.[0]?.actual_weight || 80)}
                    className="p-2 bg-purple-950/60 border-2 border-purple-500 rounded-xl text-purple-200 transition cursor-pointer flex items-center gap-1 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    title="Calculadora de discos"
                  >
                    <Disc className="w-4 h-4 text-pink-400" />
                    <span>Discos</span>
                  </button>
                )}
              </div>

              {/* Table Headers */}
              <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-black text-zinc-400 text-center px-1 font-heading">
                <span className="col-span-2 text-left">Serie</span>
                <span className="col-span-4">Peso (kg)</span>
                <span className="col-span-3">Reps</span>
                <span className="col-span-3">Estado</span>
              </div>

              {/* Sets List */}
              <div className="space-y-2.5">
                {we.sets?.map((st, setIndex) => (
                  <div
                    key={st.id}
                    className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-2xl border-2 transition-all ${
                      st.completed
                        ? 'bg-pink-950/20 border-pink-500 text-zinc-100 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-300'
                    }`}
                  >
                    <span className="col-span-2 text-xs font-black text-pink-400 pl-1 font-heading">
                      #{st.set_number}
                    </span>

                    {/* Weight Controls */}
                    <div className="col-span-4 flex items-center justify-center gap-1 bg-zinc-900 border-2 border-zinc-800 rounded-xl p-1">
                      <button
                        onClick={() => handleUpdateSetValue(weIndex, setIndex, 'actual_weight', -2.5)}
                        className="p-1 text-zinc-400 hover:text-zinc-100 active:scale-90 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-black text-zinc-100 w-10 text-center font-heading">
                        {st.actual_weight}
                      </span>
                      <button
                        onClick={() => handleUpdateSetValue(weIndex, setIndex, 'actual_weight', 2.5)}
                        className="p-1 text-zinc-400 hover:text-zinc-100 active:scale-90 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Reps Controls */}
                    <div className="col-span-3 flex items-center justify-center gap-1 bg-zinc-900 border-2 border-zinc-800 rounded-xl p-1">
                      <button
                        onClick={() => handleUpdateSetValue(weIndex, setIndex, 'actual_reps', -1)}
                        className="p-1 text-zinc-400 hover:text-zinc-100 active:scale-90 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-black text-zinc-100 w-6 text-center font-heading">
                        {st.actual_reps}
                      </span>
                      <button
                        onClick={() => handleUpdateSetValue(weIndex, setIndex, 'actual_reps', 1)}
                        className="p-1 text-zinc-400 hover:text-zinc-100 active:scale-90 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Complete Checkbox Button */}
                    <div className="col-span-3 flex justify-center">
                      <button
                        onClick={() => handleToggleSetComplete(weIndex, setIndex)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all cursor-pointer active:scale-90 ${
                          st.completed
                            ? 'bg-pink-500 border-black text-zinc-950 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                            : 'bg-zinc-900 border-zinc-700 text-transparent hover:border-zinc-500'
                        }`}
                      >
                        <Check className="w-5 h-5 stroke-[3]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Rest Timer */}
      {isRestTimerRunning && activeRestSeconds !== null && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900 border-3 border-pink-500 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-40">
          <div className="flex items-center gap-2 text-pink-400">
            <Timer className="w-5 h-5 animate-pulse" />
            <span className="font-mono text-xl font-black text-zinc-100">
              {Math.floor(activeRestSeconds / 60)
                .toString()
                .padStart(2, '0')}
              :
              {(activeRestSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-2 border-l-2 border-zinc-800 pl-3">
            <button
              onClick={() => setActiveRestSeconds(prev => (prev || 0) + 30)}
              className="text-xs font-black bg-purple-900/60 border-2 border-purple-500 px-2.5 py-1 rounded-lg text-purple-200 cursor-pointer"
            >
              +30s
            </button>
            <button
              onClick={() => setIsRestTimerRunning(false)}
              className="text-xs font-black text-red-400 hover:text-red-300 px-2 py-1 cursor-pointer"
            >
              Saltar
            </button>
          </div>
        </div>
      )}

      {/* PR Celebration Modal */}
      {newPRCelebration && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="comic-card-yellow max-w-xs w-full p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/30 border-2 border-amber-400 flex items-center justify-center mx-auto text-amber-300 text-3xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
              🏆
            </div>
            <h3 className="text-xl font-black text-amber-300 font-heading">✨ ¡NUEVO RÉCORD! ✨</h3>
            <p className="text-sm text-zinc-100 font-extrabold">{newPRCelebration}</p>

            <div className="speech-bubble text-xs text-amber-200 font-bold">
              {pet.emoji} "{pet.celebration}"
            </div>

            <button
              onClick={() => setNewPRCelebration(null)}
              className="w-full comic-button bg-amber-400 hover:bg-amber-300 text-zinc-950 py-3 rounded-xl text-xs mt-2 cursor-pointer"
            >
              😎 ¡A POR MÁS!
            </button>
          </div>
        </div>
      )}

      {/* Plate Calculator Modal */}
      {selectedBarbellWeight && plateBreakdown && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="comic-card-purple max-w-xs w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="flex items-center justify-between border-b-2 border-purple-500/40 pb-3">
              <span className="text-xs font-extrabold text-purple-200 uppercase font-heading">
                Barra {selectedBarbellWeight} kg
              </span>
              <button
                onClick={() => setSelectedBarbellWeight(null)}
                className="text-xs text-purple-300 hover:text-zinc-100 font-bold"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-purple-200">
                Peso por lado: <span className="text-pink-400 font-black">{plateBreakdown.weightPerSide} kg</span>
              </p>

              <div className="bg-zinc-950 p-4 rounded-2xl border-2 border-zinc-800 space-y-2">
                {plateBreakdown.platesPerSide.length > 0 ? (
                  plateBreakdown.platesPerSide.map(item => (
                    <div key={item.plate} className="flex justify-between items-center text-xs font-bold text-zinc-200">
                      <span>Disco {item.plate} kg</span>
                      <span className="comic-badge bg-pink-500/20 text-pink-300 border-pink-400 px-2.5 py-0.5">
                        × {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-400">Solo barra olímpica de 20 kg</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FINAL WORKOUT COMPLETE SUMMARY MODAL (Section 39) */}
      {isCompletedSummaryOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="comic-card-pink max-w-sm w-full p-6 text-center space-y-5 shadow-2xl animate-in zoom-in-95">
            <div className="space-y-1">
              <div className="text-4xl">🎉🎉🎉</div>
              <h2 className="text-2xl font-black text-zinc-100 font-heading mt-2">
                ¡MISIÓN COMPLETADA!
              </h2>
            </div>

            {/* Stats Breakdown */}
            <div className="grid grid-cols-2 gap-2 text-left text-xs font-bold pt-2">
              <div className="bg-zinc-950 p-3 rounded-xl border-2 border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">Series Completadas</span>
                <span className="text-base font-black text-pink-400">💪 {completedSetsCount} series</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border-2 border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">Volumen Total</span>
                <span className="text-base font-black text-lime-400">🏋️ {session.total_volume.toLocaleString()} kg</span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border-2 border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">Tiempo</span>
                <span className="text-base font-black text-blue-400">
                  ⏱️ {Math.round((session.duration_seconds || 1800) / 60)} min
                </span>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border-2 border-zinc-800">
                <span className="text-zinc-400 block text-[10px]">Nuevos PRs</span>
                <span className="text-base font-black text-amber-400">🔥 +{newPRCount} PRs</span>
              </div>
            </div>

            {/* Mascot Quote */}
            <div className="speech-bubble text-xs text-pink-100 font-bold">
              {pet.emoji} "{pet.celebration}"
            </div>

            {/* XP Awarded Banner */}
            <div className="comic-badge bg-amber-500/20 text-amber-300 border-amber-400 text-sm py-2 px-4 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>+250 XP RECOMPENSA</span>
            </div>

            <button
              onClick={onFinishWorkout}
              className="w-full comic-button bg-pink-500 hover:bg-pink-400 text-zinc-950 py-3.5 rounded-2xl text-xs cursor-pointer font-black"
            >
              VOLVER AL PLAN
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
