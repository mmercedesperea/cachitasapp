export interface PlateBreakdown {
  targetWeight: number;
  barbellWeight: number;
  weightPerSide: number;
  platesPerSide: { plate: number; count: number }[];
  remainder: number;
}

export class PlateCalculatorService {
  private static DEFAULT_AVAILABLE_PLATES = [20, 15, 10, 5, 2.5, 1.25];

  /**
   * Calculates required weight plates per side for a barbell target weight.
   */
  static calculatePlates(
    targetWeight: number,
    barbellWeight: number = 20,
    availablePlates: number[] = PlateCalculatorService.DEFAULT_AVAILABLE_PLATES
  ): PlateBreakdown {
    if (targetWeight <= barbellWeight) {
      return {
        targetWeight,
        barbellWeight,
        weightPerSide: 0,
        platesPerSide: [],
        remainder: 0
      };
    }

    const totalWeightNeeded = targetWeight - barbellWeight;
    let weightPerSide = totalWeightNeeded / 2;
    let remainingPerSide = weightPerSide;

    const sortedPlates = [...availablePlates].sort((a, b) => b - a);
    const platesPerSide: { plate: number; count: number }[] = [];

    for (const plate of sortedPlates) {
      if (plate <= 0) continue;
      const count = Math.floor(remainingPerSide / plate);
      if (count > 0) {
        platesPerSide.push({ plate, count });
        remainingPerSide -= count * plate;
      }
    }

    return {
      targetWeight,
      barbellWeight,
      weightPerSide,
      platesPerSide,
      remainder: Math.round(remainingPerSide * 2 * 100) / 100 // Total unmatchable weight
    };
  }
}
