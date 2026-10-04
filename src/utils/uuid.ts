export function isUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function isDummyLocalUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  return id.startsWith('local-profile-slot-');
}

export function getSlotDefaultUuid(slot: number): string {
  return `00000000-0000-0000-0000-00000000000${slot}`;
}
