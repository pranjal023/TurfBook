export const HOLD_MINUTES = 5;       
export const MAX_ACTIVE_HOLDS = 3;   
export const MAX_ADVANCE_DAYS = 60; 

export const CANCELLATION_TIERS = [
  { minHours: 24, percent: 100 },
  { minHours: 4, percent: 50 },
  { minHours: 0, percent: 0 },
];