import { useEffect, useState } from 'react'

type Request = { message: string; confirmLabel: string; resolve: (ok: boolean) => void }

let show: ((r: Request) => void) | null = null

/**
 * Eigene Sicherheitsabfrage statt window.confirm(). Der Browser-Dialog wird in eingebetteten Vorschauen
 * (z. B. VS Code) unterdrückt und liefert dort stillschweigend „Abbrechen“ – Löschen ging dann nicht.
 * Aufruf: `if (await confirmDialog('Wirklich löschen?')) …`
 */
export function confirmDialog(message: string, confirmLabel = 'Löschen') {
  return new Promise<boolean>((resolve) => {
    if (show) show({ message, confirmLabel, resolve })
    else resolve(window.confirm(message))
  })
}

/** Einmal in App.tsx eingebunden; zeigt die Abfragen über allen Sheets an. */
export function Confirmer() {
  const [req, setReq] = useState<Request | null>(null)

  useEffect(() => {
    show = setReq
    return () => {
      show = null
    }
  }, [])

  const close = (ok: boolean) => {
    req?.resolve(ok)
    setReq(null)
  }

  useEffect(() => {
    if (!req) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!req) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center">
      <div className="absolute inset-0 bg-ink/30 animate-[fade-in_.15s_ease-out]" onClick={() => close(false)} />
      <div role="alertdialog" aria-modal="true" aria-label={req.message} className="relative w-full max-w-sm rounded-[2rem] bg-surface p-6 animate-[sheet-in_.22s_cubic-bezier(.2,.9,.3,1)]">
        <p className="text-[15px] leading-snug font-medium">{req.message}</p>
        <div className="mt-5 flex gap-2">
          <button type="button" autoFocus onClick={() => close(false)} className="h-11 flex-1 rounded-full bg-bg px-4 text-[15px] font-semibold transition active:scale-[.98]">
            Abbrechen
          </button>
          <button type="button" onClick={() => close(true)} className="h-11 flex-1 rounded-full bg-warn px-4 text-[15px] font-semibold text-surface transition active:scale-[.98]">
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
