export const PLAYER_NAME_MAX_LENGTH = 16;

export function normalizePlayerName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  if (!name || name.length > PLAYER_NAME_MAX_LENGTH || /[\u0000-\u001f\u007f-\u009f]/.test(name)) return null;
  return name;
}
