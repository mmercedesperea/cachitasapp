export interface PinVerificationResult {
  success: boolean;
  attempts: number;
  lockedUntil: string | null;
  errorMessage?: string;
}

export class PinService {
  private static MAX_ATTEMPTS = 5;
  private static LOCKOUT_MINUTES = 5;

  /**
   * Hashes a 4-digit PIN string securely using SHA-256 via Web Crypto API.
   */
  static async hashPin(pin: string): Promise<string> {
    if (!/^\d{4}$/.test(pin)) {
      throw new Error('PIN must be exactly 4 digits');
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifies an input PIN against stored pin_hash, handling attempts and lockout.
   */
  static async verifyPin(
    inputPin: string,
    storedHash: string | null,
    currentAttempts: number = 0,
    lockedUntil: string | null = null
  ): Promise<PinVerificationResult> {
    const now = new Date();

    // Check lockout status
    if (lockedUntil && new Date(lockedUntil) > now) {
      const remainingSeconds = Math.ceil((new Date(lockedUntil).getTime() - now.getTime()) / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      return {
        success: false,
        attempts: currentAttempts,
        lockedUntil,
        errorMessage: `Perfil bloqueado. Inténtalo de nuevo en ${remainingMinutes} minuto(s).`
      };
    }

    if (!storedHash) {
      return {
        success: true,
        attempts: 0,
        lockedUntil: null
      };
    }

    const inputHash = await this.hashPin(inputPin);
    if (inputHash === storedHash) {
      return {
        success: true,
        attempts: 0,
        lockedUntil: null
      };
    }

    const newAttempts = currentAttempts + 1;
    let newLockedUntil: string | null = null;

    if (newAttempts >= this.MAX_ATTEMPTS) {
      const lockoutTime = new Date(now.getTime() + this.LOCKOUT_MINUTES * 60 * 1000);
      newLockedUntil = lockoutTime.toISOString();
      return {
        success: false,
        attempts: newAttempts,
        lockedUntil: newLockedUntil,
        errorMessage: `5 intentos fallidos. Perfil bloqueado por 5 minutos.`
      };
    }

    return {
      success: false,
      attempts: newAttempts,
      lockedUntil: null,
      errorMessage: `PIN incorrecto. Quedan ${this.MAX_ATTEMPTS - newAttempts} intentos.`
    };
  }
}
