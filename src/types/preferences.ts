// src/types/preferences.ts
export interface UserPreferences {
    placesToAvoid: string[];
    dietaryRestrictions: string[];
    mealsPerDay: number;
    calorieTarget: number;
    updatedAt?: string;
  }