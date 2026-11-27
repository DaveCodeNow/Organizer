import { useState } from 'react'
import { Cloud, CloudOff, RefreshCw, TriangleAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { signOut, syncNow, useSync } from '../../lib/sync'
import { Button, IconButton, Sheet } from '../../components/ui'

const time = (ms: number) => new Date(ms).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })

/** Wolken-Symbol im Header: zeigt den Sync-Status und öffnet Konto-Infos mit Abmelden. */
export function AccountButton() {
  const { session, status, lastSync, error } = useSync()
  const [open, setOpen] = useState(false)
  if (!supabase || !session) return null

  const Icon = status === 'syncing' ? RefreshCw : status === 'offline' ? CloudOff : status === 'error' ? TriangleAlert : Cloud
  const text =
    status === 'syncing' ? 'Wird synchronisiert …'
    : status === 'offline' ? 'Offline – Änderungen werden später hochgeladen'
    : status === 'error' ? `Synchronisierung fehlgeschlagen${error ? `: ${error}` : ''}`
    : lastSync ? `Synchronisiert um ${time(lastSync)}`
    : 'Bereit'

  return (
    <>
      <IconButton label="Konto & Synchronisierung" onClick={() => setOpen(true)}>
        <Icon size={19} className={`${status === 'syncing' ? 'animate-spin' : ''} ${status === 'error' ? 'text-warn' : ''}`} />
      </IconButton>
      <Sheet open={open} onClose={() => setOpen(false)} title="Konto">
        <div className="space-y-4">
          <div className="rounded-2xl bg-bg px-4 py-3">
            <p className="text-xs font-semibold text-muted">Angemeldet als</p>
            <p className="mt-0.5 truncate text-[15px] font-medium">{session.user.email}</p>
          </div>
          <p className={`text-sm ${status === 'error' ? 'text-warn' : 'text-muted'}`}>{text}</p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" disabled={status === 'syncing'} onClick={() => void syncNow()}>
              <RefreshCw size={17} /> Jetzt synchronisieren
            </Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await signOut()
              }}
            >
              Abmelden
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  )
}
