import { create } from 'zustand';
import { Profile, WorkoutSession, ProfilePreferences, Program } from '../types';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { WorkoutRepository, PreferencesRepository, ProgramRepository } from '../repositories/WorkoutAndOtherRepositories';

interface AppState {
  activeProfileId: string | null;
  activeProfile: Profile | null;
  activeSession: WorkoutSession | null;
  activeProgram: Program | null;
  preferences: ProfilePreferences | null;
  isOffline: boolean;

  setActiveProfileId: (id: string | null) => Promise<void>;
  refreshActiveProfile: () => Promise<void>;
  setActiveSession: (session: WorkoutSession | null) => void;
  setOfflineStatus: (isOffline: boolean) => void;
  lockProfile: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeProfileId: localStorage.getItem('cachitas_active_profile_id') || null,
  activeProfile: null,
  activeSession: null,
  activeProgram: null,
  preferences: null,
  isOffline: !navigator.onLine,

  setActiveProfileId: async (id: string | null) => {
    if (id) {
      localStorage.setItem('cachitas_active_profile_id', id);
      const profile = await ProfileRepository.getProfileById(id);
      const session = await WorkoutRepository.getActiveSession(id);
      const prefs = await PreferencesRepository.getPreferences(id);
      const program = await ProgramRepository.getActiveProgramForProfile(id);

      set({
        activeProfileId: id,
        activeProfile: profile,
        activeSession: session,
        preferences: prefs,
        activeProgram: program,
      });
    } else {
      localStorage.removeItem('cachitas_active_profile_id');
      set({
        activeProfileId: null,
        activeProfile: null,
        activeSession: null,
        preferences: null,
        activeProgram: null,
      });
    }
  },

  refreshActiveProfile: async () => {
    const id = get().activeProfileId;
    if (id) {
      const profile = await ProfileRepository.getProfileById(id);
      const prefs = await PreferencesRepository.getPreferences(id);
      const program = await ProgramRepository.getActiveProgramForProfile(id);
      set({ activeProfile: profile, preferences: prefs, activeProgram: program });
    }
  },

  setActiveSession: (session: WorkoutSession | null) => {
    set({ activeSession: session });
  },

  setOfflineStatus: (isOffline: boolean) => {
    set({ isOffline });
  },

  lockProfile: () => {
    localStorage.removeItem('cachitas_active_profile_id');
    set({
      activeProfileId: null,
      activeProfile: null,
      activeSession: null,
      preferences: null,
      activeProgram: null,
    });
  }
}));
