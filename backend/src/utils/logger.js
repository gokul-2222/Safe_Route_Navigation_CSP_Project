export const logger = {
  info: (msg, ...args) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, ...args);
  },
  error: (msg, err, ...args) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, err || '', ...args);
  },
  warn: (msg, ...args) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, ...args);
  }
};
