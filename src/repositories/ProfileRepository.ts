import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { isUuid, isDummyLocalUuid, getSlotDefaultUuid } from '../utils/uuid';

async function withTimeout<T>(promise: PromiseLike<T>, ms = 2000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Network timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

export class ProfileRepository {
  private static LOCAL_PROFILES_KEY = 'cachitas_local_profiles';

  public static getLocalProfiles(): Profile[] {
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

  private static async syncProfileToRemote(profile: Profile): Promise<void> {
    try {
      const res: any = await withTimeout(
        supabase.from('profiles').upsert(profile, { onConflict: 'slot' })
      );
      if (res.error) throw res.error;
    } catch {
      // Ignore offline sync errors
    }
  }

  public static async ensureProfileExistsInSupabase(profileId: string): Promise<void> {
    if (!isUuid(profileId)) return;
    try {
      const checkRes: any = await withTimeout(
        supabase.from('profiles').select('id').eq('id', profileId).maybeSingle()
      );
      if (!checkRes.error && checkRes.data) return;

      const localProfiles = this.getLocalProfiles();
      let profileToUpsert = localProfiles.find(p => p.id === profileId);

      if (!profileToUpsert) {
        const slotMatch = profileId.match(/00000000-0000-0000-0000-00000000000(\d)/);
        const slot = slotMatch ? parseInt(slotMatch[1], 10) : 1;
        profileToUpsert = {
          id: profileId,
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
        };
      }

      const upsertRes: any = await withTimeout(
        supabase.from('profiles').upsert(profileToUpsert, { onConflict: 'slot' })
      );
      if (upsertRes.error) {
        await withTimeout(
          supabase.from('profiles').upsert(profileToUpsert)
        );
      }
    } catch {
      // Ignore offline or network errors
    }
  }

  static async getAllProfiles(): Promise<Profile[]> {
    const localProfiles = this.getLocalProfiles();
    try {
      const res: any = await withTimeout(
        supabase.from('profiles').select('*').order('slot', { ascending: true })
      );
      if (res.error || !res.data || res.data.length === 0) {
        return localProfiles;
      }

      const remoteProfiles: Profile[] = res.data;
      const mergedProfiles: Profile[] = [1, 2, 3, 4].map(slot => {
        const local = localProfiles.find(p => p.slot === slot);
        const remote = remoteProfiles.find(p => p.slot === slot);

        if (!remote) {
          if (local) {
            if (local.onboarding_completed) {
              this.syncProfileToRemote(local);
            }
            return local;
          }
          return {
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
          };
        }

        if (local && local.onboarding_completed && !remote.onboarding_completed) {
          this.syncProfileToRemote(local);
          return local;
        }

        if (local && local.updated_at && remote.updated_at) {
          const localTime = new Date(local.updated_at).getTime();
          const remoteTime = new Date(remote.updated_at).getTime();
          if (localTime > remoteTime && local.onboarding_completed) {
            this.syncProfileToRemote(local);
            return local;
          }
        }

        return remote;
      });

      this.saveLocalProfiles(mergedProfiles);
      return mergedProfiles;
    } catch {
      return localProfiles;
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
      const res: any = await withTimeout(
        supabase
          .from('profiles')
          .upsert(updatedProfile, { onConflict: 'slot' })
          .select()
          .single()
      );

      if (res.error) throw res.error;

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
