import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileRepository } from '../repositories/ProfileRepository';
import { EquipmentRepository } from '../repositories/EquipmentAndExerciseRepository';

describe('Repositories', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('ProfileRepository loads 4 default fixed profile slots', async () => {
    const profiles = await ProfileRepository.getAllProfiles();
    expect(profiles).toHaveLength(4);
    expect(profiles.map(p => p.slot)).toEqual([1, 2, 3, 4]);
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

  it('ProfileRepository resets profile slot preserving the slot number', async () => {
    const profiles = await ProfileRepository.getAllProfiles();
    const target = profiles[0];
    await ProfileRepository.updateProfile({ id: target.id, name: 'Carlos', onboarding_completed: true });

    const reset = await ProfileRepository.resetProfile(target.id);
    expect(reset.slot).toBe(1);
    expect(reset.name).toBeNull();
    expect(reset.onboarding_completed).toBe(false);
  });

  it('EquipmentRepository persists equipment selection per profile', async () => {
    const profileId = 'local-profile-slot-1';
    await EquipmentRepository.setProfileEquipmentSlugs(profileId, ['rack', 'barra-olimpica', 'discos']);

    const slugs = await EquipmentRepository.getProfileEquipmentSlugs(profileId);
    expect(slugs).toEqual(['rack', 'barra-olimpica', 'discos']);
  });
});
