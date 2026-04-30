// Format seconds to MM:SS
export const fmt = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

// Parse "MM:SS" string from ESP32 back into total seconds
export const parseTime = (str) => {
  if (!str) return 0;
  const parts = str.split(":");
  if (parts.length !== 2) return 0;
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};

// Fisher–Yates shuffle (returns a new array)
export const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
