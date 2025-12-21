export const createClientId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `job_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};
