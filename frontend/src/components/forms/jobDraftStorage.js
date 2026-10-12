const draftVersion = 1;

export const readJobDraft = (storage, key) => {
  if (!storage || !key) return null;
  try {
    const saved = JSON.parse(storage.getItem(key) || 'null');
    if (saved?.version !== draftVersion || !saved.job || typeof saved.job !== 'object') return null;
    return {
      job: saved.job,
      currentStep: Number.isInteger(saved.currentStep) ? Math.max(0, Math.min(4, saved.currentStep)) : 0,
      savedAt: Number(saved.savedAt) || 0,
    };
  } catch {
    return null;
  }
};

export const writeJobDraft = (storage, key, draft) => {
  if (!storage || !key) return false;
  try {
    storage.setItem(key, JSON.stringify({ ...draft, version: draftVersion, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
};

export const removeJobDraft = (storage, key) => {
  if (!storage || !key) return;
  try {
    storage.removeItem(key);
  } catch {
    return;
  }
};
