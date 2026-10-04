export interface ProgressionRecommendation {
  recommendedWeight: number;
  reason: string;
}

export class ProgressionService {
  /**
   * Calculates estimated 1RM using Epley's formula: e1RM = weight * (1 + reps / 30)
   * If reps is 1, returns weight.
   */
  static calculateE1RM(weight: number, reps: number): number {
    if (weight <= 0 || reps <= 0) return 0;
    if (reps === 1) return weight;
    const e1rm = weight * (1 + reps / 30);
    return Math.round(e1rm * 10) / 10;
  }

  /**
   * Calculates total volume for a set or session: weight * reps
   */
  static calculateVolume(weight: number, reps: number): number {
    if (weight <= 0 || reps <= 0) return 0;
    return weight * reps;
  }

  /**
   * Recommends next load based on experience level, movement category, completed sets, and RPE.
   */
  static recommendNextWeight(params: {
    lastWeight: number;
    completedReps: number;
    targetReps: number;
    rpe?: number | null;
    experienceLevel: 'Principiante' | 'Intermedio' | 'Avanzado' | string;
    isUpperBody: boolean;
    upperIncrement?: number;
    lowerIncrement?: number;
  }): ProgressionRecommendation {
    const {
      lastWeight,
      completedReps,
      targetReps,
      rpe,
      experienceLevel,
      isUpperBody,
      upperIncrement = 2.5,
      lowerIncrement = 5.0
    } = params;

    const increment = isUpperBody ? upperIncrement : lowerIncrement;

    // Failure / reps missed
    if (completedReps < targetReps) {
      return {
        recommendedWeight: lastWeight,
        reason: `Mantener ${lastWeight} kg: No se completaron las repeticiones objetivo (${completedReps}/${targetReps}).`
      };
    }

    // Beginner logic
    if (experienceLevel === 'Principiante') {
      const nextWeight = lastWeight + increment;
      return {
        recommendedWeight: nextWeight,
        reason: `Subir a ${nextWeight} kg (+${increment} kg): Repeticiones objetivo completadas.`
      };
    }

    // Intermediate RPE logic
    if (experienceLevel === 'Intermedio') {
      if (rpe === undefined || rpe === null) {
        const nextWeight = lastWeight + increment;
        return {
          recommendedWeight: nextWeight,
          reason: `Subir a ${nextWeight} kg (+${increment} kg): Repeticiones completadas.`
        };
      }

      if (rpe <= 8) {
        const nextWeight = lastWeight + increment;
        return {
          recommendedWeight: nextWeight,
          reason: `RPE ${rpe} (≤ 8). Subir a ${nextWeight} kg (+${increment} kg) para la siguiente sesión.`
        };
      } else if (rpe <= 9) {
        return {
          recommendedWeight: lastWeight,
          reason: `RPE ${rpe}. Mantener ${lastWeight} kg para consolidar la carga.`
        };
      } else {
        return {
          recommendedWeight: lastWeight,
          reason: `RPE ${rpe} (> 9). Mantener ${lastWeight} kg para evitar fatiga acumulada.`
        };
      }
    }

    // Advanced Training Max logic (e1RM % based)
    return {
      recommendedWeight: lastWeight,
      reason: `Avanzado: Ajuste basado en el 90% del e1RM.`
    };
  }
}
