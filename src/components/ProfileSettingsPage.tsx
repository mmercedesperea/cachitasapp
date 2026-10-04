import React, { useState, useEffect } from 'react';
import { Lock, Download, Trash2, Shield, Settings, KeyRound, Check } from 'lucide-react';
import { Profile } from '../types';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { WorkoutRepository, PersonalRecordRepository, BodyWeightRepository } from '../repositories/WorkoutAndOtherRepositories';
import { PinService } from '../services/PinService';

interface ProfileSettingsPageProps {
  profile: Profile;
  onLockProfile: () => void;
  onProfileUpdated: (updated: Profile) => void;
}

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

  const handleSavePin = async () => {
    setPinError(null);

    if (profile.pin_enabled) {
      // Validate current PIN first
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
    <div className="space-y-6 pb-24 max-w-2xl mx-auto p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">Ajustes del Perfil</h1>
        <p className="text-xs text-zinc-400 mt-1">
          {profile.name || `Perfil ${profile.slot}`} • Slot {profile.slot}
        </p>
      </div>

      {/* Security & PIN Section */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-800 rounded-2xl text-lime-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-zinc-100">Protección PIN (4 dígitos)</h3>
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
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            {profile.pin_enabled ? 'Cambiar / Desactivar' : 'Activar PIN'}
          </button>
        </div>
      </div>

      {/* Lock Profile Button */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-zinc-100">Bloquear Perfil</h3>
          <p className="text-xs text-zinc-400 font-medium">Vuelve a la pantalla de selección de perfil</p>
        </div>

        <button
          onClick={onLockProfile}
          className="bg-lime-400 hover:bg-lime-300 text-zinc-950 font-black text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Lock className="w-4 h-4" />
          <span>Bloquear</span>
        </button>
      </div>

      {/* Backup & Export Data */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-zinc-100">Exportar Datos (Backup JSON)</h3>
          <p className="text-xs text-zinc-400 font-medium">Descarga todo tu historial de entrenamientos y PRs</p>
        </div>

        <button
          onClick={handleExportData}
          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Download className="w-4 h-4 text-lime-400" />
          <span>Exportar</span>
        </button>
      </div>

      {/* Reset Profile (Danger Zone) */}
      <div className="bg-red-950/20 border border-red-500/30 rounded-3xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-red-400">Resetear Perfil</h3>
          <p className="text-xs text-zinc-400 font-medium">Elimina entrenamientos y PRs preservando el Slot {profile.slot}</p>
        </div>

        <button
          onClick={() => setShowResetModal(true)}
          className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-400 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          <span>Resetear</span>
        </button>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 max-w-xs w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-zinc-100">Configuración de PIN</h3>

            {pinError && <p className="text-xs text-red-400 font-medium">{pinError}</p>}

            <div className="space-y-3 text-xs">
              {profile.pin_enabled && (
                <div>
                  <label className="block text-zinc-400 mb-1">PIN Actual</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={currentPin}
                    onChange={e => setCurrentPin(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-center text-lg tracking-widest"
                  />
                </div>
              )}

              <div>
                <label className="block text-zinc-400 mb-1">Nuevo PIN (4 dígitos)</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-center text-lg tracking-widest"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Confirmar Nuevo PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPin}
                  onChange={e => setConfirmPin(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 text-center text-lg tracking-widest"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleSavePin}
                className="w-full bg-lime-400 text-zinc-950 font-black py-3 rounded-xl text-xs active:scale-95"
              >
                Guardar PIN
              </button>

              {profile.pin_enabled && (
                <button
                  onClick={handleDisablePin}
                  className="w-full bg-red-500/20 text-red-400 border border-red-500/30 font-bold py-2.5 rounded-xl text-xs"
                >
                  Desactivar Proteccion PIN
                </button>
              )}

              <button
                onClick={() => setShowPinModal(false)}
                className="w-full text-zinc-400 hover:text-zinc-200 text-xs py-1"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/40 rounded-3xl p-6 max-w-xs w-full text-center space-y-4 shadow-2xl">
            <h3 className="text-lg font-black text-red-400">¿Resetear este Perfil?</h3>
            <p className="text-xs text-zinc-400">
              Se eliminarán todos los entrenamientos, PRs y preferencias. El perfil volverá a estar libre como Perfil {profile.slot}.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 bg-zinc-800 text-zinc-300 font-bold py-3 rounded-xl text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetProfile}
                className="flex-1 bg-red-500 text-white font-bold py-3 rounded-xl text-xs"
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
