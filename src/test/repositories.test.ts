import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { EquipmentRepository } from '../repositories/EquipmentAndExerciseRepository';
import { BodyWeightRepository, WorkoutRepository, PersonalRecordRepository } from '../repositories/WorkoutAndOtherRepositories';
import { SyncService } from '../services/SyncService';
import { isUuid, isDummyLocalUuid, generateUuid } from '../utils/uuid';

describe('Repositories and UUID handling', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generateUuid produces valid UUID v4 strings', () => {
    const uuid1 = generateUuid();
    const uuid2 = generateUuid();
    expect(isUuid(uuid1)).toBe(true);
    expect(isUuid(uuid2)).toBe(true);
    expect(uuid1).not.toBe(uuid2);
  });

  it('isUuid correctly identifies valid and invalid UUIDs', () => {
    expect(isUuid('00000000-0000-0000-0000-000000000001')).toBe(true);
    expect(isUuid('c7b12345-6789-abcd-ef01-234567890abc')).toBe(true);
    expect(isUuid('local-profile-slot-1')).toBe(false);
    expect(isUuid('invalid-uuid')).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });

  it('isDummyLocalUuid identifies legacy local IDs but allows slot default UUIDs for Supabase sync', () => {
    expect(isDummyLocalUuid('00000000-0000-0000-0000-000000000001')).toBe(false);
    expect(isDummyLocalUuid('local-profile-slot-1')).toBe(true);
    expect(isDummyLocalUuid('c7b12345-6789-abcd-ef01-234567890abc')).toBe(false);
  });

  it('ProfileRepository loads 4 default fixed profile slots with valid UUIDs', async () => {
    const profiles = await ProfileRepository.getAllProfiles();
    expect(profiles).toHaveLength(4);
    expect(profiles.map(p => p.slot)).toEqual([1, 2, 3, 4]);
    for (const p of profiles) {
      expect(isUuid(p.id)).toBe(true);
    }
  });

  it('ProfileRepository auto-migrates legacy "local-profile-slot-N" IDs in localStorage', async () => {
    const legacyData = [
      { id: 'local-profile-slot-1', slot: 1, name: 'Old User 1' },
      { id: 'local-profile-slot-2', slot: 2, name: 'Old User 2' },
    ];
    localStorage.setItem('cachitas_local_profiles', JSON.stringify(legacyData));

    const profiles = await ProfileRepository.getAllProfiles();
    expect(profiles[0].id).toBe('00000000-0000-0000-0000-000000000001');
    expect(profiles[0].name).toBe('Old User 1');
    expect(profiles[1].id).toBe('00000000-0000-0000-0000-000000000002');
    expect(profiles[1].name).toBe('Old User 2');
  });

  it('ProfileRepository gets profile by legacy or slot-based ID', async () => {
    const profile = await ProfileRepository.getProfileById('local-profile-slot-1');
    expect(profile).not.toBeNull();
    expect(profile?.slot).toBe(1);
  });

  it('ProfileRepository updates profile data correctly', async () => {
    const profiles = await ProfileRepository.getAllProfiles();
    const target = profiles[0];

    const updated = await ProfileRepository.updateProfile({
      id: target.id,
      name: 'Carlos',
      age: 35,
      weight_kg: 82.5,
      onboarding_completed: true
    });

    expect(updated.name).toBe('Carlos');
    expect(updated.onboarding_completed).toBe(true);

    const reloaded = await ProfileRepository.getProfileById(target.id);
    expect(reloaded?.name).toBe('Carlos');
  });

  it('BodyWeightRepository generates valid UUIDs for new entries', async () => {
    const profileId = '00000000-0000-0000-0000-000000000001';
    const entry = await BodyWeightRepository.addEntry(profileId, 78.5);

    expect(isUuid(entry.id)).toBe(true);
    expect(entry.weight_kg).toBe(78.5);

    const entries = await BodyWeightRepository.getEntriesForProfile(profileId);
    expect(entries.some(e => e.id === entry.id)).toBe(true);
  });

  it('ProfileRepository.ensureProfileExistsInSupabase runs without error for valid UUID', async () => {
    const profileId = '00000000-0000-0000-0000-000000000001';
    await expect(ProfileRepository.ensureProfileExistsInSupabase(profileId)).resolves.not.toThrow();
  });

  it('SyncService processQueue handles empty queue gracefully', async () => {
    const res = await SyncService.processQueue();
    expect(res).toEqual({ syncedCount: 0, remainingCount: 0 });
  });

  it('EquipmentRepository persists equipment selection per profile and accepts legacy IDs', async () => {
    const profileId = 'local-profile-slot-1';
    await EquipmentRepository.setProfileEquipmentSlugs(profileId, ['rack', 'barra-olimpica', 'discos']);

    const slugs = await EquipmentRepository.getProfileEquipmentSlugs(profileId);
    expect(slugs).toEqual(['rack', 'barra-olimpica', 'discos']);
  });
});
