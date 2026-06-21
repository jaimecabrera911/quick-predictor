const DEFAULT_WELCOME_DELAY_MS = 3000;

function parseWelcomeDelayMs(): number {
  const raw = process.env.EXPO_PUBLIC_WELCOME_DELAY_MS;
  if (!raw) return DEFAULT_WELCOME_DELAY_MS;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return DEFAULT_WELCOME_DELAY_MS;
  }

  return parsed;
}

/** Tiempo de espera en la pantalla de bienvenida antes de ir al login (ms). */
export const WELCOME_DELAY_MS = parseWelcomeDelayMs();
