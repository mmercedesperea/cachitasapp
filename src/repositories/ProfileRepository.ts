import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { isUuid, isDummyLocalUuid, getSlotDefaultUuid } from '../utils/uuid';

async function withTimeout<T>(promise: PromiseLike<T>, ms = 500): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Network timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

export class ProfileRepository {
  private static LOCAL_PROFILES_KEY = 'cachitas_local_profiles';

  private static getLocalProfiles(): Profile[] {
    const data = localStorage.getItem(this.LOCAL_PROFILES_KEY);
    if (data) {
      try {
        const parsed: Profile[] = JSON.parse(data);
        let migrated = false;
        const profiles = parsed.map(p => {
          if (!isUuid(p.id) || p.id.startsWith('local-profile-slot-')) {
            migrated = true;
            return {
              ...p,
              id: getSlotDefaultUuid(p.slot)
            };
          }
          return p;
        });
        if (migrated) {
          this.saveLocalProfiles(profiles);
        }
        return profiles;
      } catch (e) {
        // invalid JSON
      }
    }
    const defaultProfiles: Profile[] = [1, 2, 3, 4].map(slot => ({
      id: getSlotDefaultUuid(slot),
      slot,
      name: null,
      age: null,
      height_cm: null,
      weight_kg: null,
      experience_level: null,
      primary_goal: null,
      unit_system: 'metric',
      avatar: null,
      onboarding_completed: false,
      pin_hash: null,
      pin_enabled: false,
      pin_attempts: 0,
      pin_locked_until: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    localStorage.setItem(this.LOCAL_PROFILES_KEY, JSON.stringify(defaultProfiles));
    return defaultProfiles;
  }

  private static saveLocalProfiles(profiles: Profile[]): void {
    localStorage.setItem(this.LOCAL_PROFILES_KEY, JSON.stringify(profiles));
  }

  static async getAllProfiles(): Promise<Profile[]> {
    try {
      const res: any = await withTimeout(supabase.from('profiles').select('*').order('slot', { ascending: true }));
      if (res.error || !res.data || res.data.length === 0) {
        return this.getLocalProfiles();
      }
      this.saveLocalProfiles(res.data);
      return res.data;
    } catch {
      return this.getLocalProfiles();
    }
  }

  static async getProfileBySlot(slot: number): Promise<Profile | null> {
    const profiles = await this.getAllProfiles();
    return profiles.find(p => p.slot === slot) || null;
  }

  static async getProfileById(id: string): Promise<Profile | null> {
    const profiles = await this.getAllProfiles();
    let profile = profiles.find(p => p.id === id);
    if (!profile) {
      const slotMatch = id.match(/slot-(\d+)/) || id.match(/00000000-0000-0000-0000-00000000000(\d)/);
      if (slotMatch) {
        const slotNum = parseInt(slotMatch[1], 10);
        profile = profiles.find(p => p.slot === slotNum);
      }
    }
    return profile || null;
  }

  static async updateProfile(profile: Partial<Profile> & { id: string }): Promise<Profile> {
    const profiles = this.getLocalProfiles();
    const index = profiles.findIndex(p => p.id === profile.id || (profile.slot && p.slot === profile.slot));

    let updatedProfile: Profile;
    if (index !== -1) {
      updatedProfile = { ...profiles[index], ...profile, updated_at: new Date().toISOString() };
      profiles[index] = updatedProfile;
    } else {
      updatedProfile = profile as Profile;
      profiles.push(updatedProfile);
    }
    this.saveLocalProfiles(profiles);

    try {
      let query = supabase.from('profiles').update({ ...profile, updated_at: new Date().toISOString() });

      if (isUuid(profile.id) && !isDummyLocalUuid(profile.id)) {
        query = query.eq('id', profile.id);
      } else if (profile.slot) {
        query = query.eq('slot', profile.slot);
      } else {
        return updatedProfile;
      }

      const res: any = await withTimeout(query.select().single());
      if (res.data) {
        const idx = profiles.findIndex(p => p.slot === res.data.slot);
        if (idx !== -1) {
          profiles[idx] = res.data;
          this.saveLocalProfiles(profiles);
        }
        return res.data;
      }
    } catch {
      // offline fallback
    }

    return updatedProfile;
  }

  static async resetProfile(id: string): Promise<Profile> {
    const profile = await this.getProfileById(id);
    if (!profile) throw new Error('Profile not found');

    const resetData: Partial<Profile> & { id: string } = {
      id: profile.id,
      slot: profile.slot,
      name: null,
      age: null,
      height_cm: null,
      weight_kg: null,
      experience_level: null,
      primary_goal: null,
      onboarding_completed: false,
      pin_hash: null,
      pin_enabled: false,
      pin_attempts: 0,
      pin_locked_until: null,
      updated_at: new Date().toISOString(),
    };

    return await this.updateProfile(resetData);
  }
}
