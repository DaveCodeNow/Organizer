/** Wechselt von überall aus den Tab (z. B. Kacheln in der Übersicht). App.tsx hört zu. */
type Listener = (tab: string) => void
const listeners = new Set<Listener>()

export const navigate = (tab: string) => listeners.forEach((l) => l(tab))

export function onNavigate(l: Listener) {
  listeners.add(l)
  return () => void listeners.delete(l)
}
