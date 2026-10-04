import React, { useState, useEffect } from 'react';
import { Delete, Lock, User, PlusCircle, Award, Check } from 'lucide-react';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { WorkoutRepository } from '../repositories/WorkoutAndOtherRepositories';
import { PinService } from '../services/PinService';
import { Profile } from '../types';
import { useAppStore } from '../stores/useAppStore';

interface ProfileCardInfo {
  profile: Profile;
  workoutCount: number;
}

export const ProfileSelectorPage: React.FC<{ onSelectProfile: (profile: Profile) => void; onStartOnboarding: (profile: Profile) => void }> = ({
  onSelectProfile,
  onStartOnboarding,
}) => {
  const [cards, setCards] = useState<ProfileCardInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [lockoutMsg, setLockoutMsg] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    const profiles = await ProfileRepository.getAllProfiles();
    const cardData: ProfileCardInfo[] = [];

    for (const p of profiles) {
      const sessions = await WorkoutRepository.getSessionsForProfile(p.id);
      const completedSessions = sessions.filter(s => s.status === 'completed');
      cardData.push({
        profile: p,
        workoutCount: completedSessions.length
      });
    }

    setCards(cardData);
    setLoading(false);
  };

  const handleCardClick = (info: ProfileCardInfo) => {
    const { profile } = info;
    if (!profile.onboarding_completed) {
      onStartOnboarding(profile);
      return;
    }

    if (profile.pin_enabled && profile.pin_hash) {
      setSelectedProfile(profile);
      setPinInput('');
      setPinError(null);
      setLockoutMsg(null);
    } else {
      onSelectProfile(profile);
    }
  };

  const handlePinKeyPress = (digit: string) => {
    if (pinInput.length < 4) {
      const updated = pinInput + digit;
      setPinInput(updated);
      if (updated.length === 4) {
        verifyPinCode(updated);
      }
    }
  };

  const handlePinDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    setPinError(null);
  };

  const verifyPinCode = async (pin: string) => {
    if (!selectedProfile || !selectedProfile.pin_hash) return;

    const result = await PinService.verifyPin(
      pin,
      selectedProfile.pin_hash,
      selectedProfile.pin_attempts,
      selectedProfile.pin_locked_until
    );

    // Save attempts / lock state to DB
    const updatedProfile = await ProfileRepository.updateProfile({
      id: selectedProfile.id,
      pin_attempts: result.attempts,
      pin_locked_until: result.lockedUntil
    });

    if (result.success) {
      onSelectProfile(updatedProfile);
    } else {
      setPinInput('');
      setPinError(result.errorMessage || 'PIN Incorrecto');
      setSelectedProfile(updatedProfile);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
            ¿Quién va a entrenar?
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Selecciona tu perfil de entrenamiento personal
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6">
          {cards.map(card => {
            const { profile, workoutCount } = card;
            const isConfigured = profile.onboarding_completed;

            return (
              <button
                key={profile.slot}
                onClick={() => handleCardClick(card)}
                className={`relative flex flex-col items-center justify-center p-5 rounded-2xl border transition-all duration-200 text-left min-h-[160px] cursor-pointer ${
                  isConfigured
                    ? 'bg-zinc-900/80 border-zinc-800 hover:border-lime-500/50 hover:bg-zinc-900 active:scale-95'
                    : 'bg-zinc-900/30 border-dashed border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                }`}
              >
                <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-xl mb-3 shadow-inner">
                  {isConfigured ? (
                    profile.name ? profile.name.charAt(0).toUpperCase() : '👤'
                  ) : (
                    <PlusCircle className="w-7 h-7 text-lime-400" />
                  )}
                </div>

                <div className="text-center w-full">
                  <h3 className="font-bold text-base text-zinc-100 truncate">
                    {isConfigured ? profile.name || `Perfil ${profile.slot}` : `Perfil ${profile.slot}`}
                  </h3>
                  {isConfigured ? (
                    <div className="mt-1 flex items-center justify-center gap-1.5 text-xs text-lime-400 font-medium">
                      <span>💪 {workoutCount} entrenamientos</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs text-zinc-500">Configurar perfil</p>
                  )}
                </div>

                {isConfigured && profile.pin_enabled && (
                  <div className="absolute top-3 right-3 bg-zinc-800/80 p-1.5 rounded-full text-zinc-400">
                    <Lock className="w-3.5 h-3.5 text-lime-400" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* PIN Keypad Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-xs w-full text-center space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div>
              <h2 className="text-xl font-bold text-zinc-100">Introduce tu PIN</h2>
              <p className="text-xs text-zinc-400 mt-1">{selectedProfile.name || `Perfil ${selectedProfile.slot}`}</p>
            </div>

            {/* PIN Dots */}
            <div className="flex justify-center items-center gap-4 py-2">
              {[0, 1, 2, 3].map(idx => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    pinInput.length > idx
                      ? 'bg-lime-400 shadow-[0_0_12px_rgba(163,230,53,0.6)]'
                      : 'bg-zinc-800 border border-zinc-700'
                  }`}
                />
              ))}
            </div>

            {pinError && <p className="text-xs text-red-400 font-medium">{pinError}</p>}

            {/* Touch Keypad */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  onClick={() => handlePinKeyPress(num)}
                  className="h-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xl font-semibold text-zinc-100 active:scale-95 transition-all flex items-center justify-center shadow"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                onClick={() => handlePinKeyPress('0')}
                className="h-14 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-xl font-semibold text-zinc-100 active:scale-95 transition-all flex items-center justify-center shadow"
              >
                0
              </button>
              <button
                onClick={handlePinDelete}
                className="h-14 rounded-2xl bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400 active:scale-95 transition-all flex items-center justify-center"
              >
                <Delete className="w-6 h-6" />
              </button>
            </div>

            <button
              onClick={() => setSelectedProfile(null)}
              className="mt-4 text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
