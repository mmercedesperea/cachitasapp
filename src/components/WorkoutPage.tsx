import React, { useState, useEffect, useRef } from 'react';
import { Check, Plus, Minus, Timer, Disc, Award, ChevronLeft } from 'lucide-react';
import { Profile, WorkoutSession, PersonalRecord, Exercise } from '../types';
import { WorkoutRepository, ProgramRepository, PersonalRecordRepository } from '../repositories/WorkoutAndOtherRepositories';
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
    onFinishWorkout();
  };

  if (loading || !session) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-100 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <h1 className="text-lg font-black text-zinc-100">Sesión en Curso</h1>
          <p className="text-[11px] text-zinc-400 font-medium">
            Volumen Total: <span className="text-lime-400 font-bold">{session.total_volume} kg</span>
          </p>
        </div>

        <button
          onClick={handleCompleteWorkout}
          className="bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs px-3.5 py-2 rounded-xl active:scale-95 transition-all cursor-pointer"
        >
          Finalizar
        </button>
      </div>

      {/* Exercises & Sets List */}
      <div className="space-y-6">
        {session.exercises?.map((we, weIndex) => (
          <div key={we.id} className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-100">{we.exercise?.name}</h3>
                <p className="text-[11px] text-zinc-400 font-medium">
                  {we.exercise?.category} • Objetivo: 4 × 5 @ {we.sets?.[0]?.target_weight || 80} kg
                </p>
              </div>

              {we.exercise?.equipment_required?.includes('barra-olimpica') && (
                <button
                  onClick={() => handleOpenPlateCalculator(we.sets?.[0]?.actual_weight || 80)}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 transition cursor-pointer flex items-center gap-1 text-xs font-bold"
                  title="Calculadora de discos"
                >
                  <Disc className="w-4 h-4 text-lime-400" />
                  <span>Discos</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-12 gap-2 text-[10px] uppercase font-bold text-zinc-500 text-center px-1">
              <span className="col-span-2 text-left">Serie</span>
              <span className="col-span-4">Peso (kg)</span>
              <span className="col-span-3">Reps</span>
              <span className="col-span-3">Completado</span>
            </div>

            <div className="space-y-2.5">
              {we.sets?.map((st, setIndex) => (
                <div
                  key={st.id}
                  className={`grid grid-cols-12 gap-2 items-center p-2.5 rounded-2xl border transition-all ${
                    st.completed
                      ? 'bg-lime-950/20 border-lime-500/40 text-zinc-100'
                      : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300'
                  }`}
                >
                  <span className="col-span-2 text-xs font-black text-zinc-400 pl-1">
                    #{st.set_number}
                  </span>

                  <div className="col-span-4 flex items-center justify-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                    <button
                      onClick={() => handleUpdateSetValue(weIndex, setIndex, 'actual_weight', -2.5)}
                      className="p-1 text-zinc-400 hover:text-zinc-100 active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-zinc-100 w-10 text-center">
                      {st.actual_weight}
                    </span>
                    <button
                      onClick={() => handleUpdateSetValue(weIndex, setIndex, 'actual_weight', 2.5)}
                      className="p-1 text-zinc-400 hover:text-zinc-100 active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="col-span-3 flex items-center justify-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
                    <button
                      onClick={() => handleUpdateSetValue(weIndex, setIndex, 'actual_reps', -1)}
                      className="p-1 text-zinc-400 hover:text-zinc-100 active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-zinc-100 w-6 text-center">
                      {st.actual_reps}
                    </span>
                    <button
                      onClick={() => handleUpdateSetValue(weIndex, setIndex, 'actual_reps', 1)}
                      className="p-1 text-zinc-400 hover:text-zinc-100 active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="col-span-3 flex justify-center">
                    <button
                      onClick={() => handleToggleSetComplete(weIndex, setIndex)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all cursor-pointer active:scale-90 ${
                        st.completed
                          ? 'bg-lime-400 border-lime-400 text-zinc-950 shadow-md shadow-lime-400/20'
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
        ))}
      </div>

      {isRestTimerRunning && activeRestSeconds !== null && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900/95 border border-lime-500/50 backdrop-blur-md px-6 py-3 rounded-full flex items-center gap-4 shadow-2xl z-40">
          <div className="flex items-center gap-2 text-lime-400">
            <Timer className="w-5 h-5 animate-pulse" />
            <span className="font-mono text-lg font-black tracking-widest text-zinc-100">
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
              className="text-xs font-bold bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 rounded-lg text-zinc-200"
            >
              +30s
            </button>
            <button
              onClick={() => setIsRestTimerRunning(false)}
              className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-1"
            >
              Saltar
            </button>
          </div>
        </div>
      )}

      {newPRCelebration && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/50 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
              <Award className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-amber-400">¡NUEVO RÉCORD!</h3>
            <p className="text-sm text-zinc-200 font-medium">{newPRCelebration}</p>
            <button
              onClick={() => setNewPRCelebration(null)}
              className="w-full bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black py-3 rounded-xl text-xs mt-2"
            >
              ¡A POR MÁS!
            </button>
          </div>
        </div>
      )}

      {selectedBarbellWeight && plateBreakdown && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-xs w-full space-y-4 text-center shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-xs font-extrabold text-zinc-400 uppercase">Barra {selectedBarbellWeight} kg</span>
              <button
                onClick={() => setSelectedBarbellWeight(null)}
                className="text-xs text-zinc-400 hover:text-zinc-100"
              >
                Cerrar
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-zinc-400">
                Peso por lado: <span className="text-lime-400 font-bold">{plateBreakdown.weightPerSide} kg</span>
              </p>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800/80 space-y-2">
                {plateBreakdown.platesPerSide.length > 0 ? (
                  plateBreakdown.platesPerSide.map(item => (
                    <div key={item.plate} className="flex justify-between items-center text-xs font-bold text-zinc-200">
                      <span>Disco {item.plate} kg</span>
                      <span className="bg-lime-400/10 border border-lime-400/30 text-lime-400 px-2.5 py-1 rounded-lg">
                        × {item.count}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-zinc-500">Solo barra olímpica de 20 kg</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
