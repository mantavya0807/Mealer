// src/types/preferences.js
export function createUserPreferences({
  placesToAvoid = [],
  dietaryRestrictions = [],
  mealsPerDay = 0,
  calorieTarget = 0,
  updatedAt = new Date().toISOString(),
} = {}) {
  return {
    placesToAvoid,
    dietaryRestrictions,
    mealsPerDay,
    calorieTarget,
    updatedAt,
  };
}
