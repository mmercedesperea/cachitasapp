import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Profile } from '../types';
import { EquipmentRepository, SEEDED_EQUIPMENT, ExerciseRepository, SEEDED_EXERCISES } from '../repositories/EquipmentAndExerciseRepository';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { PreferencesRepository } from '../repositories/WorkoutAndOtherRepositories';

interface OnboardingProps {
  profile: Profile;
  onComplete: (updatedProfile: Profile) => void;
}

export const OnboardingWizard: React.FC<OnboardingProps> = ({ profile, onComplete }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [age, setAge] = useState<number>(30);
  const [heightCm, setHeightCm] = useState<number>(175);
  const [weightKg, setWeightKg] = useState<number>(75);
  const [experienceLevel, setExperienceLevel] = useState('Intermedio');
  const [primaryGoal, setPrimaryGoal] = useState('Powerlifting');
  const [selectedEquipmentSlugs, setSelectedEquipmentSlugs] = useState<string[]>(SEEDED_EQUIPMENT.map(e => e.slug));
  const [favoriteExerciseIds, setFavoriteExerciseIds] = useState<string[]>([]);

  useEffect(() => {
    // Select default key powerlifting exercises
    const defaults = SEEDED_EXERCISES.filter(e => e.is_powerlifting).map(e => e.id);
    setFavoriteExerciseIds(defaults);
  }, []);

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
    else handleFinish();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const toggleEquipment = (slug: string) => {
    setSelectedEquipmentSlugs(prev =>
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  const toggleFavorite = (id: string) => {
    setFavoriteExerciseIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleFinish = async () => {
    const updated = await ProfileRepository.updateProfile({
      id: profile.id,
      name: name || `Perfil ${profile.slot}`,
      age,
      height_cm: heightCm,
      weight_kg: weightKg,
      experience_level: experienceLevel,
      primary_goal: primaryGoal,
      onboarding_completed: true,
    });

    // Fire secondary persistence / background syncs without blocking UI transition
    EquipmentRepository.setProfileEquipmentSlugs(profile.id, selectedEquipmentSlugs);
    Promise.all(
      favoriteExerciseIds.map(exId => ExerciseRepository.toggleFavoriteExercise(profile.id, exId))
    );
    PreferencesRepository.savePreferences({
      profile_id: profile.id,
      training_days: [1, 2, 4, 5],
      session_duration: 60,
      upper_body_increment: 2.5,
      lower_body_increment: 5.0,
      default_rest_seconds: 120,
      updated_at: new Date().toISOString()
    });

    onComplete(updated);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-6 max-w-xl mx-auto">
      {/* Step Header */}
      <div className="space-y-2 pt-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
          <span>Paso {step} de 5</span>
          <span>{Math.round((step / 5) * 100)}% Completado</span>
        </div>
        <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
          <div
            className="bg-lime-400 h-full transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="py-6 flex-1 flex flex-col justify-center">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-2xl font-bold">Información Personal</h2>
              <p className="text-xs text-zinc-400 mt-1">Ingresa tus datos básicos para calibrar entrenamientos</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ej. Carlos"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:border-lime-400 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Edad</label>
                  <input
                    type="number"
                    value={age}
                    onChange={e => setAge(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-zinc-100 focus:outline-none focus:border-lime-400 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Altura (cm)</label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={e => setHeightCm(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-zinc-100 focus:outline-none focus:border-lime-400 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Peso (kg)</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={e => setWeightKg(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-3 text-zinc-100 focus:outline-none focus:border-lime-400 text-sm text-center"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-2xl font-bold">Nivel de Experiencia</h2>
              <p className="text-xs text-zinc-400 mt-1">Define la estrategia de progresión de cargas</p>
            </div>

            <div className="space-y-3">
              {[
                { title: 'Principiante', desc: 'Progresión lineal constante sesión a sesión (+2.5kg / +5kg)' },
                { title: 'Intermedio', desc: 'Progresión regulada por RPE e historial de fatiga' },
                { title: 'Avanzado', desc: 'Programación por porcentajes y Training Max (90% e1RM)' }
              ].map(opt => (
                <button
                  key={opt.title}
                  onClick={() => setExperienceLevel(opt.title)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all ${
                    experienceLevel === opt.title
                      ? 'bg-zinc-900 border-lime-400 text-zinc-100'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-bold text-sm text-zinc-100">{opt.title}</div>
                  <div className="text-xs mt-1 text-zinc-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-2xl font-bold">Objetivo Principal</h2>
              <p className="text-xs text-zinc-400 mt-1">Determina el diseño de tus rutinas</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                'Powerlifting',
                'Fuerza',
                'Fuerza + hipertrofia',
                'CrossFit',
                'Recomposición corporal',
                'Pérdida de grasa'
              ].map(goal => (
                <button
                  key={goal}
                  onClick={() => setPrimaryGoal(goal)}
                  className={`p-4 rounded-2xl border text-center font-medium text-xs transition-all ${
                    primaryGoal === goal
                      ? 'bg-zinc-900 border-lime-400 text-lime-400'
                      : 'bg-zinc-900/40 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-2xl font-bold">Equipamiento Disponible</h2>
              <p className="text-xs text-zinc-400 mt-1">Solo recomendaremos ejercicios que puedas realizar</p>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
              {SEEDED_EQUIPMENT.map(eq => {
                const selected = selectedEquipmentSlugs.includes(eq.slug);
                return (
                  <button
                    key={eq.slug}
                    onClick={() => toggleEquipment(eq.slug)}
                    className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
                      selected
                        ? 'bg-zinc-900 border-lime-500/80 text-zinc-100'
                        : 'bg-zinc-900/30 border-zinc-800/80 text-zinc-500'
                    }`}
                  >
                    <span>{eq.name}</span>
                    {selected && <Check className="w-4 h-4 text-lime-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-6 animate-in fade-in">
            <div>
              <h2 className="text-2xl font-bold">Ejercicios Favoritos</h2>
              <p className="text-xs text-zinc-400 mt-1">Aparecerán con prioridad en tu plan de entrenamiento</p>
            </div>

            <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {SEEDED_EXERCISES.slice(0, 10).map(ex => {
                const selected = favoriteExerciseIds.includes(ex.id);
                return (
                  <button
                    key={ex.id}
                    onClick={() => toggleFavorite(ex.id)}
                    className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
                      selected
                        ? 'bg-zinc-900 border-lime-500 text-zinc-100'
                        : 'bg-zinc-900/30 border-zinc-800 text-zinc-500'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{ex.name}</div>
                      <div className="text-[10px] text-zinc-400">{ex.category}</div>
                    </div>
                    {selected && <Check className="w-4 h-4 text-lime-400" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-900">
        <button
          onClick={handleBack}
          disabled={step === 1}
          className={`flex items-center gap-1.5 text-xs font-semibold py-3 px-4 rounded-xl transition ${
            step === 1 ? 'opacity-0 pointer-events-none' : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          <ArrowLeft className="w-4 h-4" /> Atrás
        </button>

        <button
          onClick={handleNext}
          className="flex items-center gap-2 text-xs font-bold bg-lime-400 hover:bg-lime-300 text-zinc-950 py-3.5 px-6 rounded-xl active:scale-95 transition-all shadow-lg shadow-lime-400/20"
        >
          <span>{step === 5 ? 'Finalizar Configuración' : 'Siguiente'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
