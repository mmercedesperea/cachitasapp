import React, { useState, useEffect } from 'react';
import { Home, Calendar, Dumbbell, BookOpen, TrendingUp, User, WifiOff } from 'lucide-react';
import { useAppStore } from './stores/useAppStore';
import { ProfileSelectorPage } from './components/ProfileSelectorPage';
import { OnboardingWizard } from './components/OnboardingWizard';
import { Dashboard } from './components/Dashboard';
import { PlanPage } from './components/PlanPage';
import { ExercisesCatalog } from './components/ExercisesCatalog';
import { WorkoutPage } from './components/WorkoutPage';
import { ProgressPage } from './components/ProgressPage';
import { ProfileSettingsPage } from './components/ProfileSettingsPage';
import { Profile } from './types';

export const App: React.FC = () => {
  const {
    activeProfileId,
    activeProfile,
    setActiveProfileId,
    refreshActiveProfile,
    lockProfile,
    isOffline,
    setOfflineStatus
  } = useAppStore();

  const [currentTab, setCurrentTab] = useState<'dashboard' | 'plan' | 'workout' | 'exercises' | 'progress' | 'profile'>('dashboard');
  const [onboardingProfile, setOnboardingProfile] = useState<Profile | null>(null);
  const [activeWorkoutProgramDayId, setActiveWorkoutProgramDayId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const handleOnline = () => setOfflineStatus(false);
    const handleOffline = () => setOfflineStatus(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSelectProfile = async (p: Profile) => {
    await setActiveProfileId(p.id);
    setCurrentTab('dashboard');
  };

  const handleStartOnboarding = (p: Profile) => {
    setOnboardingProfile(p);
  };

  const handleOnboardingComplete = async (updated: Profile) => {
    setOnboardingProfile(null);
    await setActiveProfileId(updated.id);
    setCurrentTab('dashboard');
  };

  const handleStartWorkout = (programDayId?: string) => {
    setActiveWorkoutProgramDayId(programDayId);
    setCurrentTab('workout');
  };

  if (onboardingProfile) {
    return <OnboardingWizard profile={onboardingProfile} onComplete={handleOnboardingComplete} />;
  }

  if (!activeProfileId || !activeProfile) {
    return (
      <ProfileSelectorPage
        onSelectProfile={handleSelectProfile}
        onStartOnboarding={handleStartOnboarding}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-pink-500 selection:text-white">
      {/* Offline Status Banner */}
      {isOffline && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[11px] font-extrabold px-4 py-1.5 flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5" />
          <span>Modo Offline — Los entrenamientos se guardarán localmente y se sincronizarán al conectar</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="min-h-[calc(100vh-64px)]">
        {currentTab === 'dashboard' && (
          <Dashboard
            profile={activeProfile}
            onStartWorkout={handleStartWorkout}
            onNavigateToProgress={() => setCurrentTab('progress')}
            onNavigateToPlan={() => setCurrentTab('plan')}
          />
        )}

        {currentTab === 'plan' && (
          <PlanPage
            profile={activeProfile}
            onStartWorkout={handleStartWorkout}
          />
        )}

        {currentTab === 'workout' && (
          <WorkoutPage
            profile={activeProfile}
            programDayId={activeWorkoutProgramDayId}
            onFinishWorkout={() => setCurrentTab('dashboard')}
            onBack={() => setCurrentTab('dashboard')}
          />
        )}

        {currentTab === 'exercises' && (
          <ExercisesCatalog profileId={activeProfile.id} />
        )}

        {currentTab === 'progress' && (
          <ProgressPage profile={activeProfile} />
        )}

        {currentTab === 'profile' && (
          <ProfileSettingsPage
            profile={activeProfile}
            onLockProfile={lockProfile}
            onProfileUpdated={() => refreshActiveProfile()}
          />
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/95 border-t-2 border-zinc-800 backdrop-blur-lg z-40">
        <div className="max-w-md mx-auto grid grid-cols-6 h-16">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              currentTab === 'dashboard' ? 'text-pink-400 font-black scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-bold">Inicio</span>
          </button>

          <button
            onClick={() => setCurrentTab('plan')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              currentTab === 'plan' ? 'text-pink-400 font-black scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-[9px] font-bold">Plan</span>
          </button>

          <button
            onClick={() => handleStartWorkout()}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              currentTab === 'workout' ? 'text-pink-400 font-black scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Dumbbell className="w-5 h-5" />
            <span className="text-[9px] font-bold">Entrenar</span>
          </button>

          <button
            onClick={() => setCurrentTab('exercises')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              currentTab === 'exercises' ? 'text-pink-400 font-black scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-[9px] font-bold">Ejercicios</span>
          </button>

          <button
            onClick={() => setCurrentTab('progress')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              currentTab === 'progress' ? 'text-pink-400 font-black scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[9px] font-bold">Progreso</span>
          </button>

          <button
            onClick={() => setCurrentTab('profile')}
            className={`flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              currentTab === 'profile' ? 'text-pink-400 font-black scale-105' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] font-bold">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default App;
