import React, { useState } from 'react';
import { Lock, Download, Trash2, KeyRound, Sparkles, Trophy, Award, Heart } from 'lucide-react';
import { Profile } from '../types';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { WorkoutRepository, PersonalRecordRepository, BodyWeightRepository } from '../repositories/WorkoutAndOtherRepositories';
import { PinService } from '../services/PinService';

interface ProfileSettingsPageProps {
  profile: Profile;
  onLockProfile: () => void;
  onProfileUpdated: (updated: Profile) => void;
}

export const PET_AVATARS = [
  { id: '🐱', name: 'Gato Fitness' },
  { id: '🐼', name: 'Panda Fuerza' },
  { id: '🐰', name: 'Conejo Velocidad' },
  { id: '🐻', name: 'Oso Powerlifter' },
  { id: '🐸', name: 'Rana Cardio' },
  { id: '🦊', name: 'Zorro Astuto' },
  { id: '🐶', name: 'Perro Leal' }
];

export const ProfileSettingsPage: React.FC<ProfileSettingsPageProps> = ({
  profile,
  onLockProfile,
  onProfileUpdated,
}) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const handleSelectPet = async (petEmoji: string) => {
    const updated = await ProfileRepository.updateProfile({
      id: profile.id,
      avatar: petEmoji
    });
    onProfileUpdated(updated);
  };

  const handleSavePin = async () => {
    setPinError(null);

    if (profile.pin_enabled) {
      const verification = await PinService.verifyPin(
        currentPin,
        profile.pin_hash,
        profile.pin_attempts,
        profile.pin_locked_until
      );
      if (!verification.success) {
        setPinError(verification.errorMessage || 'PIN actual incorrecto.');
        return;
      }
    }

    if (!/^\d{4}$/.test(newPin)) {
      setPinError('El nuevo PIN debe tener exactamente 4 dígitos.');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('Los nuevos PINs no coinciden.');
      return;
    }

    const pinHash = await PinService.hashPin(newPin);
    const updated = await ProfileRepository.updateProfile({
      id: profile.id,
      pin_hash: pinHash,
      pin_enabled: true,
      pin_attempts: 0,
      pin_locked_until: null
    });

    onProfileUpdated(updated);
    setShowPinModal(false);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
  };

  const handleDisablePin = async () => {
    if (!profile.pin_enabled) return;

    if (!/^\d{4}$/.test(currentPin)) {
      setPinError('Introduce tu PIN actual de 4 dígitos.');
      return;
    }

    const verification = await PinService.verifyPin(
      currentPin,
      profile.pin_hash,
      profile.pin_attempts,
      profile.pin_locked_until
    );

    if (!verification.success) {
      setPinError(verification.errorMessage || 'PIN actual incorrecto.');
      return;
    }

    const updated = await ProfileRepository.updateProfile({
      id: profile.id,
      pin_enabled: false,
      pin_hash: null,
      pin_attempts: 0,
      pin_locked_until: null
    });

    onProfileUpdated(updated);
    setShowPinModal(false);
    setCurrentPin('');
  };

  const handleExportData = async () => {
    const sessions = await WorkoutRepository.getSessionsForProfile(profile.id);
    const prs = await PersonalRecordRepository.getPRsForProfile(profile.id);
    const weights = await BodyWeightRepository.getEntriesForProfile(profile.id);

    const exportData = {
      profile,
      workout_sessions: sessions,
      personal_records: prs,
      body_weight_entries: weights,
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${profile.name || `slot-${profile.slot}`}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetProfile = async () => {
    const reset = await ProfileRepository.resetProfile(profile.id);
    onProfileUpdated(reset);
    onLockProfile();
  };

  return (
    <div className="space-y-6 pb-28 max-w-2xl mx-auto p-4 sm:p-6 font-sans">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          Ajustes de Perfil Kawaii ✨
        </h1>
        <p className="text-xs text-pink-300 font-bold mt-1">
          {profile.name || `Perfil ${profile.slot}`} • Slot {profile.slot}
        </p>
      </div>

      {/* Pet / Avatar Selector Card */}
      <div className="bg-zinc-900/90 border-2 border-pink-500/50 rounded-3xl p-5 space-y-3 shadow-[4px_4px_0px_0px_#ec4899]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-pink-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="text-sm font-black text-white">Selecciona tu Mascota / Avatar</h3>
          </div>
          <span className="text-2xl">{profile.avatar || '🐱'}</span>
        </div>

        <p className="text-xs text-zinc-400 font-medium">
          Tu compañero te acompañará en el dashboard, entrenamientos y PRs.
        </p>

        <div className="grid grid-cols-7 gap-2 pt-1">
          {PET_AVATARS.map(pet => {
            const isSelected = (profile.avatar || '🐱') === pet.id;

            return (
              <button
                key={pet.id}
                onClick={() => handleSelectPet(pet.id)}
                className={`p-2 rounded-2xl text-2xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-pink-500 border-black shadow-[2px_2px_0px_0px_#000] scale-110'
                    : 'bg-zinc-950/80 border-zinc-800 hover:border-pink-400/50'
                }`}
                title={pet.name}
              >
                <span>{pet.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Gamification Badges / Achievements Collection */}
      <div className="bg-zinc-900/90 border-2 border-zinc-800 rounded-3xl p-5 space-y-3 shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400">
            <Trophy className="w-5 h-5" />
            <h3 className="text-sm font-black text-white">Colección de Logros</h3>
          </div>
          <span className="text-xs font-black text-pink-400 bg-pink-500/20 px-2.5 py-1 rounded-xl border border-pink-500/30">
            {profile.xp || 250} XP Acumulados
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-amber-300">
            <span className="text-xl">🏋️</span>
            <div>
              <span className="block font-black text-white">Primera Sesión</span>
              <span className="text-[10px] text-zinc-400 font-normal">Desbloqueado</span>
            </div>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-amber-300">
            <span className="text-xl">🔥</span>
            <div>
              <span className="block font-black text-white">Racha Activa</span>
              <span className="text-[10px] text-zinc-400 font-normal">{profile.streak_weeks || 1} semanas</span>
            </div>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-800 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold text-amber-300">
            <span className="text-xl">🏆</span>
            <div>
              <span className="block font-black text-white">Primer PR</span>
              <span className="text-[10px] text-zinc-400 font-normal">Desbloqueado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Security & PIN Section */}
      <div className="bg-zinc-900/90 border-2 border-zinc-800 rounded-3xl p-5 space-y-4 shadow-[4px_4px_0px_0px_#000]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-800 rounded-2xl text-pink-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Protección PIN (4 dígitos)</h3>
              <p className="text-xs text-zinc-400 font-medium">
                {profile.pin_enabled ? 'Protección activa con PIN' : 'Sin PIN de protección'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setShowPinModal(true);
              setPinError(null);
            }}
            className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl border border-zinc-700 transition cursor-pointer"
          >
            {profile.pin_enabled ? 'Cambiar / Desactivar' : 'Activar PIN'}
          </button>
        </div>
      </div>

      {/* Lock Profile Button */}
      <div className="bg-zinc-900/90 border-2 border-zinc-800 rounded-3xl p-5 flex items-center justify-between shadow-[4px_4px_0px_0px_#000]">
        <div>
          <h3 className="text-sm font-black text-white">Bloquear Perfil</h3>
          <p className="text-xs text-zinc-400 font-medium">Vuelve al selector de 4 perfiles protegidos</p>
        </div>

        <button
          onClick={onLockProfile}
          className="bg-pink-500 hover:bg-pink-600 text-white font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 transition active:translate-y-0.5 border-2 border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
        >
          <Lock className="w-4 h-4" />
          <span>Bloquear</span>
        </button>
      </div>

      {/* Backup & Export Data */}
      <div className="bg-zinc-900/90 border-2 border-zinc-800 rounded-3xl p-5 flex items-center justify-between shadow-[4px_4px_0px_0px_#000]">
        <div>
          <h3 className="text-sm font-black text-white">Exportar Datos (Backup JSON)</h3>
          <p className="text-xs text-zinc-400 font-medium">Descarga todo tu historial de entrenamientos y PRs</p>
        </div>

        <button
          onClick={handleExportData}
          className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 transition active:translate-y-0.5 cursor-pointer"
        >
          <Download className="w-4 h-4 text-pink-400" />
          <span>Exportar</span>
        </button>
      </div>

      {/* Reset Profile (Danger Zone) */}
      <div className="bg-red-950/20 border-2 border-red-500/40 rounded-3xl p-5 flex items-center justify-between shadow-[4px_4px_0px_0px_#000]">
        <div>
          <h3 className="text-sm font-black text-red-400">Resetear Perfil</h3>
          <p className="text-xs text-zinc-400 font-medium">Elimina entrenamientos y PRs preservando el Slot {profile.slot}</p>
        </div>

        <button
          onClick={() => setShowResetModal(true)}
          className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2 transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Resetear</span>
        </button>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-pink-500 rounded-3xl p-6 max-w-xs w-full space-y-4 shadow-[8px_8px_0px_0px_#ec4899]">
            <h3 className="text-lg font-black text-white">Configuración de PIN</h3>

            {pinError && <p className="text-xs text-red-400 font-bold">{pinError}</p>}

            <div className="space-y-3 text-xs">
              {profile.pin_enabled && (
                <div>
                  <label className="block text-zinc-400 mb-1 font-bold">PIN Actual</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={currentPin}
                    onChange={e => setCurrentPin(e.target.value)}
                    className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl px-3 py-2 text-white text-center text-lg tracking-widest font-black"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-400 mb-1 font-bold">Nuevo PIN (4 dígitos)</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl px-3 py-2 text-white text-center text-lg tracking-widest font-black"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-bold">Confirmar Nuevo PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value)}
                  className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-xl px-3 py-2 text-white text-center text-lg tracking-widest font-black"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleSavePin}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-3 rounded-2xl text-xs border-2 border-black shadow-[3px_3px_0px_0px_#000] cursor-pointer"
              >
                Guardar PIN
              </button>

              {profile.pin_enabled && (
                <button
                  onClick={handleDisablePin}
                  className="w-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2.5 rounded-2xl text-xs cursor-pointer"
                >
                  Desactivar Protección PIN
                </button>
              )}

              <button
                onClick={() => setShowPinModal(false)}
                className="w-full text-zinc-400 hover:text-zinc-200 text-xs py-1 font-bold cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border-2 border-red-500/60 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-[8px_8px_0px_0px_#000]">
            <h3 className="text-lg font-black text-red-400">¿Resetear este Perfil?</h3>
            <p className="text-xs text-zinc-300 font-medium">
              Se eliminarán todos los entrenamientos, PRs y preferencias. El perfil volverá a estar libre como Perfil {profile.slot}.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 bg-zinc-800 text-zinc-300 font-bold py-3 rounded-2xl text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetProfile}
                className="flex-1 bg-red-500 text-white font-black py-3 rounded-2xl text-xs border-2 border-black shadow-[2px_2px_0px_0px_#000] cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
