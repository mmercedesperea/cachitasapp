export interface PRCheckResult {
  isNewPR: boolean;
  recordType?: 'e1RM' | 'Max Weight' | 'Max Reps' | 'Volume';
  previousValue?: number;
  newValue?: number;
  message?: string;
}

export interface ExistingPR {
  record_type: string;
  weight: number;
  reps: number;
  estimated_1rm: number;
}

export class PersonalRecordService {
  /**
   * Checks if a completed set achieves a new personal record compared to existing PR records for an exercise.
   */
  static checkNewPR(
    weight: number,
    reps: number,
    existingPRs: ExistingPR[]
  ): PRCheckResult {
    if (weight <= 0 || reps <= 0) {
      return { isNewPR: false };
    }

    const currentE1RM = weight * (1 + reps / 30);
    const existingE1RMPR = existingPRs.find(pr => pr.record_type === 'e1RM');
    const previousE1RM = existingE1RMPR ? existingE1RMPR.estimated_1rm : 0;

    if (currentE1RM > previousE1RM && previousE1RM > 0) {
      const diff = Math.round((currentE1RM - previousE1RM) * 10) / 10;
      return {
        isNewPR: true,
        recordType: 'e1RM',
        previousValue: Math.round(previousE1RM * 10) / 10,
        newValue: Math.round(currentE1RM * 10) / 10,
        message: `🏆 NUEVO PR! e1RM: ${Math.round(currentE1RM * 10) / 10} kg (+${diff} kg)`
      };
    } else if (!existingE1RMPR && currentE1RM > 0) {
      return {
        isNewPR: true,
        recordType: 'e1RM',
        previousValue: 0,
        newValue: Math.round(currentE1RM * 10) / 10,
        message: `🏆 PRIMER PR REGISTRADO! e1RM: ${Math.round(currentE1RM * 10) / 10} kg`
      };
    }

    return { isNewPR: false };
  }
}
