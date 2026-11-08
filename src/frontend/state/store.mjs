// Minimal observable state container for view models: get / set(patch) / subscribe.
export function createStore(initial) {
  let state = { ...initial };
  const listeners = new Set();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
      for (const listener of [...listeners]) listener(state);
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
