import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

type Listener = (msg: string) => void
const listeners = new Set<Listener>()

/** Kurze Bestätigung am unteren Bildschirmrand, von überall aufrufbar. */
export function toast(msg: string) {
  listeners.forEach((l) => l(msg))
}

export function Toaster() {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null)

  useEffect(() => {
    const l: Listener = (text) => setMsg({ text, key: Date.now() })
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])

  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2400)
    return () => clearTimeout(t)
  }, [msg])

  if (!msg) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex justify-center px-4">
      <div
        key={msg.key}
        className="flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-[sheet-in_.25s_ease-out]"
      >
        <CheckCircle2 size={18} className="text-green-400" />
        {msg.text}
      </div>
    </div>
  )
}
