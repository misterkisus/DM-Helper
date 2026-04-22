type Listener = (event: string) => void;

const g = globalThis as unknown as { __pf2eListeners?: Set<Listener> };
g.__pf2eListeners ??= new Set();
const listeners = g.__pf2eListeners;

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function broadcast(payload: unknown) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  for (const fn of listeners) {
    try {
      fn(data);
    } catch {
      listeners.delete(fn);
    }
  }
}
