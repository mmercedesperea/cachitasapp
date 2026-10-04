import React, { useState, useEffect, useRef } from 'react';
import { Check, Plus, Minus, Timer, Disc, Award, ChevronLeft, Sparkles, Heart } from 'lucide-react';
import { Profile, WorkoutSession, PersonalRecord, Exercise, ProgramDay, ProgramExercise } from '../types';
import { WorkoutRepository, ProgramRepository, PersonalRecordRepository } from '../repositories/WorkoutAndOtherRepositories';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { ExerciseRepository } from '../repositories/EquipmentAndExerciseRepository';
import { ProgressionService } from '../services/ProgressionService';
import { PersonalRecordService } from '../services/PersonalRecordService';
import { PlateCalculatorService, PlateBreakdown } from '../services/PlateCalculatorService';

interface WorkoutPageProps {
  profile: Profile;
  programDayId?: string;
  onFinishWorkout: () => void;
  onBack: () => void;
}

const SET_MOTIVATIONAL_MESSAGES = [
  '💪 ¡UNA MÁS!',
  '⚡ ¡BRUTAL!',
  '💥 ¡VAMOS!',
  '😎 ¡Imparable!',
  '🔥 ¡Serie destrozada!',
  '✨ ¡Excelente forma!'
];

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [workoutCompleteModal, setWorkoutCompleteModal] = useState(false);
  const [selectedBarbellWeight, setSelectedBarbellWeight] = useState<number | null>(null);
  const [plateBreakdown, setPlateBreakdown] = useState<PlateBreakdown | null>(null);

  const timerRef = useRef<any>(null);

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
          const weeks = await ProgramRepository.getProgramWeeks(program.id);
          let foundDay: ProgramDay | undefined;
          for (const w of weeks) {
            const match = w.days?.find((d: ProgramDay) => d.id === programDayId);
            if (match) {
              foundDay = match;
              break;
            }
          }

          if (foundDay && foundDay.exercises) {
            exercisesToLoad = foundDay.exercises.map((pe: ProgramExercise) => ({
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

  const showMotivationalToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
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
      setActiveRestSeconds(120);
      setIsRestTimerRunning(true);

      const randomMsg = SET_MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * SET_MOTIVATIONAL_MESSAGES.length)];
      showMotivationalToast(randomMsg);

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

  const handleCompleteWorkout = async () => {
    if (!session) return;
    const completedSession: WorkoutSession = {
      ...session,
      status: 'completed',
      completed_at: new Date().toISOString(),
      duration_seconds: Math.round(
        (new Date().getTime() - new Date(session.started_at).getTime()) / 1000
      )
    };
    await WorkoutRepository.saveWorkoutSession(completedSession);

    // Update Profile XP
    await ProfileRepository.updateProfile({
      id: profile.id,
      xp: (profile.xp || 0) + 100
    });

    setWorkoutCompleteModal(true);
  };

  if (loading || !session) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="animate-bounce text-4xl">🐱</div>
        <div className="font-black text-pink-400 text-sm tracking-wide animate-pulse">
          Preparando tu sesión...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto p-4 sm:p-6 font-sans">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 bg-zinc-900 border-2 border-zinc-800 rounded-2xl text-zinc-400 hover:text-white cursor-pointer shadow-[2px_2px_0px_0px_#000]"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="flex items-center gap-1.5 justify-center">
            <span className="text-lg">{profile.avatar || '🐱'}</span>
            <h1 className="text-base font-black text-white">Sesión en Curso</h1>
          </div>
          <p className="text-[11px] text-zinc-400 font-bold mt-0.5">
            Carga acumulada: <span className="text-pink-400">{session.total_volume} kg</span>
          </p>
        </div>

        <button
          onClick={handleCompleteWorkout}
          className="bg-pink-500 hover:bg-pink-600 text-white font-black text-xs px-3.5 py-2 rounded-2xl border-2 border-black shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 transition-all cursor-pointer"
        >
          Finalizar 🎉
        </button>
      </div>

      {/* Motivational Toast Banner */}
      {toastMessage && (
        <div className="bg-pink-500 text-white font-black text-xs px-4 py-2.5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_#000] text-center animate-in zoom-in-95">
          {toastMessage}
        </div>
      )}

      {/* Exercises & Sets List */}
      <div className="space-y-6">
        {session.exercises?.map((we, weIndex) => (
          <div key={we.id} className="bg-zinc-900/90 border-2 border-zinc-800 rounded-3xl p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-1.5">
                  {we.exercise?.name}
                </h3>
                <p className="text-[11px] text-pink-300 font-bold mt-0.5">
                  {we.exercise?.category} • Objetivo: 4 × 5 @ {we.sets?.[0]?.target_weight || 80} kg
                </p>
              </div>

              {we.exercise?.equipment_required?.includes('barra-olimpica') && (
                <button
                  onClick={() => handleOpenPlateCalculator(we.sets?.[0]?.actual_weight || 80)}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-zinc-200 transition cursor-pointer flex items-center gap-1 text-xs font-bold border border-zinc-700"
                  title="Calculadora de discos"
                >
                  <Disc className="w-4 h-4 text-pink-400" />
                  <span>Discos</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-black text-zinc-400 text-center px-1">
              <span className="col-span-2 text-left">Serie</span>
              <span className="col-span-4">Peso (kg)</span>
              <span className="col-span-3">Reps</span>
              <span className="col-span-3">Hecho</span>
            </div>

            <div className="space-y-2.5">
              {we.sets?.map((st, setIndex) => (
                <div
                  key={st.id}
                  className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-2xl border-2 transition-all ${
                    st.completed
                      ? 'bg-pink-500/20 border-pink-500 text-white shadow-[2px_2px_0px_0px_#ec4899]'
                      : 'bg-zinc-950/80 border-zinc-800/90 text-zinc-300'
                  }`}
                >
                  <span className="col-span-2 text-xs font-black text-zinc-400 pl-1">
                    #{st.set_number}
                  </span>

                  <div className="col-span-4 flex items-center justify-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                    <button
                      onClick={() => handleUpdateSetValue(weIndex, setIndex, 'actual_weight', -2.5)}
                      className="p-1 text-zinc-400 hover:text-white active:scale-90 font-black cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-black text-white w-10 text-center">
                      {st.actual_weight}
                    </span>
                    <button
                      onClick={() => handleUpdateSetValue(weIndex, setIndex, 'actual_weight', 2.5)}
                      className="p-1 text-zinc-400 hover:text-white active:scale-90 font-black cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="col-span-3 flex items-center justify-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                    <button
                      onClick={() => handleUpdateSetValue(weIndex, setIndex, 'actual_reps', -1)}
                      className="p-1 text-zinc-400 hover:text-white active:scale-90 font-black cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-black text-white w-6 text-center">
                      {st.actual_reps}
                    </span>
                    <button
                      onClick={() => handleUpdateSetValue(weIndex, setIndex, 'actual_reps', 1)}
                      className="p-1 text-zinc-400 hover:text-white active:scale-90 font-black cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="col-span-3 flex justify-center">
                    <button
                      onClick={() => handleToggleSetComplete(weIndex, setIndex)}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all cursor-pointer active:scale-90 ${
                        st.completed
                          ? 'bg-pink-500 border-black text-white shadow-[2px_2px_0px_0px_#000]'
                          : 'bg-zinc-900 border-zinc-700 text-transparent hover:border-pink-400'
                      }`}
                    >
                      <Check className="w-5 h-5 stroke-[3]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Rest Timer Floating Bar */}
      {isRestTimerRunning && activeRestSeconds !== null && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900/95 border-2 border-pink-500 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-4 shadow-[6px_6px_0px_0px_#000] z-40">
          <div className="flex items-center gap-2 text-pink-400">
            <Timer className="w-5 h-5 animate-pulse" />
            <span className="font-mono text-lg font-black tracking-widest text-white">
              {Math.floor(activeRestSeconds / 60)
                .toString()
                .padStart(2, '0')}
              :
              {(activeRestSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>

          <div className="flex items-center gap-2 border-l border-zinc-800 pl-3">
            <button
              onClick={() => setActiveRestSeconds(prev => (prev || 0) + 30)}
              className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-xl text-white cursor-pointer"
            >
              +30s
            </button>
            <button
              onClick={() => setIsRestTimerRunning(false)}
              className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1 cursor-pointer"
            >
              Saltar
            </button>
          </div>
        </div>
      )}

      {/* PR Celebration Modal */}
      {newPRCelebration && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-amber-400 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-[8px_8px_0px_0px_#f59e0b] animate-in zoom-in-95">
            <div className="text-5xl">{profile.avatar || '🐱'}</div>
            <h3 className="text-2xl font-black text-amber-400">✨ ¡NUEVO PR! 🏆</h3>
            <p className="text-xs text-zinc-200 font-bold">{newPRCelebration}</p>
            <button
              onClick={() => setNewPRCelebration(null)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black py-3 rounded-2xl text-xs border-2 border-black shadow-[3px_3px_0px_0px_#000] cursor-pointer"
            >
              ¡SEGUIR A FUEGO! 🔥
            </button>
          </div>
        </div>
      )}

      {/* Workout Finish Celebration Modal */}
      {workoutCompleteModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-pink-500 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-[8px_8px_0px_0px_#ec4899] animate-in zoom-in-95">
            <div className="text-5xl">{profile.avatar || '🐼'}</div>
            <h2 className="text-2xl font-black text-white">🎉 ¡MISIÓN COMPLETADA!</h2>
            <p className="text-xs text-pink-300 font-bold">
              "¡Brutal sesión! +100 XP añadidos a tu perfil."
            </p>

            <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-xs space-y-1 font-bold text-zinc-300">
              <div>Carga Total: <span className="text-pink-400">{session.total_volume} kg</span></div>
              <div>Duración: <span className="text-amber-400">~{Math.round((session.duration_seconds || 2400) / 60)} min</span></div>
            </div>

            <button
              onClick={() => {
                setWorkoutCompleteModal(false);
                onFinishWorkout();
              }}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-3 rounded-2xl text-xs border-2 border-black shadow-[3px_3px_0px_0px_#000] cursor-pointer"
            >
              VOLVER AL INICIO ✨
            </button>
          </div>
        </div>
      )}

      {/* Plate Calculator Modal */}
      {selectedBarbellWeight && plateBreakdown && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 max-w-xs w-full space-y-4 text-center shadow-[6px_6px_0px_0px_#000]">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-black text-pink-400 uppercase">Barra {selectedBarbellWeight} kg</span>
              <button
                onClick={() => setSelectedBarbellWeight(null)}
                className="text-xs text-zinc-400 hover:text-white font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-300 font-bold">
                Peso por lado: <span className="text-pink-400 font-black">{plateBreakdown.weightPerSide} kg</span>
              </p>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-2">
                {plateBreakdown.platesPerSide.length > 0 ? (
                  plateBreakdown.platesPerSide.map(item => (
                    <div key={item.plate} className="flex justify-between items-center text-xs font-bold text-white">
                      <span>Disco {item.plate} kg</span>
                      <span className="bg-pink-500/20 border border-pink-500/40 text-pink-300 px-2.5 py-1 rounded-lg">
                        × {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500 font-bold">Solo barra olímpica de 20 kg</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
