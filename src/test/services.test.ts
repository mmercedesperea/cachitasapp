import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PinService } from '../services/PinService';
import { ProgressionService } from '../services/ProgressionService';
import { PersonalRecordService } from '../services/PersonalRecordService';
import { PlateCalculatorService } from '../services/PlateCalculatorService';

describe('PinService', () => {
  it('hashes a 4-digit PIN deterministically using SHA-256', async () => {
    const hash1 = await PinService.hashPin('1234');
    const hash2 = await PinService.hashPin('1234');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('rejects invalid non-4-digit PINs', async () => {
    await expect(PinService.hashPin('123')).rejects.toThrow();
    await expect(PinService.hashPin('abcd')).rejects.toThrow();
  });

  it('validates matching PIN and resets attempts', async () => {
    const storedHash = await PinService.hashPin('1234');
    const result = await PinService.verifyPin('1234', storedHash, 2, null);
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(0);
  });

  it('handles wrong PIN, increments attempts and triggers 5-min lockout on 5th failure', async () => {
    const storedHash = await PinService.hashPin('1234');

    // 4th attempt
    const res1 = await PinService.verifyPin('9999', storedHash, 3, null);
    expect(res1.success).toBe(false);
    expect(res1.attempts).toBe(4);
    expect(res1.lockedUntil).toBeNull();

    // 5th attempt
    const res2 = await PinService.verifyPin('9999', storedHash, 4, null);
    expect(res2.success).toBe(false);
    expect(res2.attempts).toBe(5);
    expect(res2.lockedUntil).not.toBeNull();
  });
});

describe('ProgressionService', () => {
  it('calculates e1RM correctly via Epley formula', () => {
    // 100kg x 5 reps -> 100 * (1 + 5/30) = 116.666... -> 116.7
    const e1rm = ProgressionService.calculateE1RM(100, 5);
    expect(e1rm).toBe(116.7);
  });

  it('recommends weight increase for beginner when target reps met', () => {
    const rec = ProgressionService.recommendNextWeight({
      lastWeight: 100,
      completedReps: 5,
      targetReps: 5,
      experienceLevel: 'Principiante',
      isUpperBody: false
    });
    expect(rec.recommendedWeight).toBe(105);
  });

  it('recommends weight progression for intermediate based on RPE', () => {
    const rec1 = ProgressionService.recommendNextWeight({
      lastWeight: 80,
      completedReps: 5,
      targetReps: 5,
      rpe: 7.5,
      experienceLevel: 'Intermedio',
      isUpperBody: true
    });
    expect(rec1.recommendedWeight).toBe(82.5);

    const rec2 = ProgressionService.recommendNextWeight({
      lastWeight: 80,
      completedReps: 5,
      targetReps: 5,
      rpe: 9.5,
      experienceLevel: 'Intermedio',
      isUpperBody: true
    });
    expect(rec2.recommendedWeight).toBe(80);
  });
});

describe('PersonalRecordService', () => {
  it('detects a new e1RM record correctly', () => {
    const existingPRs = [
      { record_type: 'e1RM', weight: 100, reps: 5, estimated_1rm: 116.7 }
    ];

    // 105kg x 5 reps -> e1RM = 122.5
    const result = PersonalRecordService.checkNewPR(105, 5, existingPRs);
    expect(result.isNewPR).toBe(true);
    expect(result.newValue).toBe(122.5);
  });
});

describe('PlateCalculatorService', () => {
  it('calculates barbell plates per side for 100 kg target on 20 kg bar', () => {
    // 100 kg - 20 kg bar = 80 kg total plates => 40 kg per side (20kg + 20kg)
    const breakdown = PlateCalculatorService.calculatePlates(100, 20, [20, 15, 10, 5, 2.5, 1.25]);
    expect(breakdown.weightPerSide).toBe(40);
    expect(breakdown.platesPerSide).toEqual([{ plate: 20, count: 2 }]);
    expect(breakdown.remainder).toBe(0);
  });
});
