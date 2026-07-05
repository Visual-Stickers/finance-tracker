const CHANNEL = 'finance_tracker_data';
const listeners = new Set();

let bc = null;
if (typeof BroadcastChannel !== 'undefined') {
  bc = new BroadcastChannel(CHANNEL);
  bc.onmessage = () => listeners.forEach((fn) => fn());
}

window.addEventListener('storage', (e) => {
  if (e.key === '_finance_tracker_sync') listeners.forEach((fn) => fn());
});

/** Call after any mutation so other open tabs (and this tab's other pages) refetch. */
export function notifyDataChanged() {
  try {
    bc?.postMessage({ ts: Date.now() });
    localStorage.setItem('_finance_tracker_sync', Date.now().toString());
  } catch {
    /* ignore */
  }
}

/** Subscribe to changes made in any tab. Returns an unsubscribe function. */
export function onDataChanged(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
