
export const TIME_RE = /^(([01]\d|2[0-3]):[0-5]\d|24:00)$/;

export const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};