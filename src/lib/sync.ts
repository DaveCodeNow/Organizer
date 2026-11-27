import { useSyncExternalStore } from 'react'
import Dexie, { type Transaction } from 'dexie'
import type { RealtimeChannel, Session } from '@supabase/supabase-js'
import { db, seedIfEmpty, seedProducts } from './db'
import { supabase } from './supabase'
import { confirmDialog } from '../components/Confirm'

/*
 * Sync zwischen Dexie (lokal, Quelle für die Oberfläche) und Supabase (Tabelle `records`, siehe supabase/schema.sql).
 *
 * - Jede lokale Änderung landet per Dexie-Hook als „tabelle/id“ im Postausgang (localStorage) und wird kurz danach hochgeladen.
 * - Geholt wird alles, was sich seit dem letzten Abgleich geändert hat (updated_at setzt der Server).
 *   Auslöser: Anmeldung, Realtime-Benachrichtigung, App wieder sichtbar, wieder online, alle 5 Minuten.
 * - Konflikte: die zuletzt beim Server angekommene Änderung gewinnt. Noch nicht hochgeladene lokale Änderungen
 *   werden beim Holen nicht überschrieben.
 * - Löschungen werden als `deleted = true` gespeichert, damit andere Geräte sie mitbekommen.
 *
 * Neue Tabellen, die synchronisiert werden sollen: in SYNC_TABLES eintragen (IDs müssen Text-IDs aus newId() sein).
 */
export const SYNC_TABLES = ['listItems', 'recipes', 'templates', 'fixedCosts', 'todos', 'goals', 'goalCategories', 'habits', 'products'] as const
type SyncTable = (typeof SYNC_TABLES)[number]
const isSyncTable = (t: string): t is SyncTable => (SYNC_TABLES as readonly string[]).includes(t)

const K_OUTBOX = 'sync:outbox'
const K_CURSOR = 'sync:cursor'
/** Nutzer-ID, zu der die lokalen Daten gehören */
const K_OWNER = 'sync:user'

// ---------- Status für die Oberfläche ----------

export type SyncState = {
  session: Session | null | undefined // undefined = wird noch geladen
  status: 'idle' | 'syncing' | 'offline' | 'error'
  lastSync?: number
  error?: string
}
let state: SyncState = { session: supabase ? undefined : null, status: 'idle' }
const listeners = new Set<() => void>()
const setState = (patch: Partial<SyncState>) => {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}
export function useSync() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => state,
  )
}

// ---------- Postausgang ----------

let seq = 0
const outbox = new Map<string, number>(readJson<string[]>(K_OUTBOX, []).map((k) => [k, 0]))
function readJson<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T
  } catch {
    return fallback
  }
}
const saveOutbox = () => localStorage.setItem(K_OUTBOX, JSON.stringify([...outbox.keys()]))

function markDirty(tbl: SyncTable, id: string) {
  outbox.set(`${tbl}/${id}`, ++seq)
  saveOutbox()
  schedule(800)
}

/** Transaktionen, die Daten vom Server einspielen, werden markiert – sonst würden sie gleich wieder hochgeladen. */
const REMOTE = Symbol('remote')
type Tagged = Transaction & { [REMOTE]?: boolean }

function track(trans: Transaction, tbl: SyncTable, id: unknown) {
  if ((trans as Tagged)[REMOTE] || id == null) return
  trans.on('complete', () => markDirty(tbl, String(id)))
}

for (const t of SYNC_TABLES) {
  const table = db.table(t)
  table.hook('creating', (key, obj, trans) => track(trans, t, obj.id ?? key))
  table.hook('updating', (_mods, key, _obj, trans) => track(trans, t, key))
  table.hook('deleting', (key, _obj, trans) => track(trans, t, key))
}

function remoteTx(fn: () => Promise<void>) {
  return db.transaction('rw', SYNC_TABLES.map((t) => db.table(t)), async () => {
    ;(Dexie.currentTransaction as Tagged)[REMOTE] = true
    await fn()
  })
}

const clearLocal = () => remoteTx(async () => void (await Promise.all(SYNC_TABLES.map((t) => db.table(t).clear()))))

async function markAllDirty() {
  for (const t of SYNC_TABLES) for (const id of await db.table(t).toCollection().primaryKeys()) outbox.set(`${t}/${id}`, ++seq)
  saveOutbox()
}

// ---------- Abgleich ----------

type Row = { tbl: string; id: string; data: Record<string, unknown> | null; deleted: boolean; updated_at: string }
let userId: string | null = null

async function push() {
  if (!supabase || !userId || !outbox.size) return
  const snap = new Map(outbox)
  const rows = []
  for (const key of snap.keys()) {
    const i = key.indexOf('/')
    const tbl = key.slice(0, i)
    const id = key.slice(i + 1)
    if (!isSyncTable(tbl)) continue
    const data = await db.table(tbl).get(id)
    rows.push({ user_id: userId, tbl, id, data: data ?? null, deleted: !data })
  }
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from('records').upsert(rows.slice(i, i + 500))
    if (error) throw error
  }
  // Nur entfernen, was sich während des Hochladens nicht erneut geändert hat
  for (const [k, v] of snap) if (outbox.get(k) === v) outbox.delete(k)
  saveOutbox()
}

async function pull() {
  if (!supabase || !userId) return
  const cursor = localStorage.getItem(K_CURSOR)
  // 5 s Überlappung: Server-Zeitstempel stammen vom Transaktionsbeginn, späte Commits könnten sonst durchrutschen.
  const since = cursor ? new Date(Date.parse(cursor) - 5000).toISOString() : '1970-01-01T00:00:00Z'
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('records')
      .select('tbl, id, data, deleted, updated_at')
      .gt('updated_at', since)
      .order('updated_at')
      .order('tbl')
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    rows.push(...(data as Row[]))
    if (data.length < 1000) break
  }
  if (!rows.length) return
  await remoteTx(async () => {
    for (const r of rows) {
      if (!isSyncTable(r.tbl) || outbox.has(`${r.tbl}/${r.id}`)) continue
      const table = db.table(r.tbl)
      if (r.deleted || !r.data) await table.delete(r.id)
      else await table.put({ ...r.data, id: r.id })
    }
  })
  const max = rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), cursor ?? '')
  localStorage.setItem(K_CURSOR, max)
}

/** Erster Abgleich auf diesem Gerät (oder nach Kontowechsel): lokale Daten hochladen, zusammenführen oder ersetzen. */
async function firstSync() {
  if (!supabase || !userId) return
  const { count, error } = await supabase.from('records').select('id', { count: 'exact', head: true }).eq('deleted', false)
  if (error) throw error
  const local = (await Promise.all(SYNC_TABLES.map((t) => db.table(t).count()))).reduce((a, b) => a + b, 0)
  const onlySeed = local === 1 && (await db.recipes.count()) === 1 && (await db.recipes.toArray())[0].name === 'Bowl'

  if (!count) await markAllDirty()
  else if (local === 0 || onlySeed) await clearLocal()
  else {
    const merge = await confirmDialog(
      'Auf diesem Gerät sind schon Daten gespeichert. Mit deinem Konto zusammenführen? Sonst werden sie durch die Daten aus dem Konto ersetzt.',
      'Zusammenführen',
    )
    if (merge) await markAllDirty()
    else {
      outbox.clear()
      saveOutbox()
      await clearLocal()
    }
  }
  localStorage.removeItem(K_CURSOR)
  localStorage.setItem(K_OWNER, userId)
}

let running: Promise<void> | null = null
let again = false

/** Führt einen vollständigen Abgleich aus; parallele Aufrufe werden zusammengefasst. */
export function syncNow(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      if (!userId) return
      if (!navigator.onLine) return setState({ status: 'offline' })
      setState({ status: 'syncing' })
      try {
        if (localStorage.getItem(K_OWNER) !== userId) await firstSync()
        await push()
        await pull()
        await push()
        setState({ status: 'idle', lastSync: Date.now(), error: undefined })
      } catch (e) {
        console.error('Sync fehlgeschlagen', e)
        setState({ status: navigator.onLine ? 'error' : 'offline', error: e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e) })
      }
    } while (again)
  })().finally(() => (running = null))
  return running
}

let timer: ReturnType<typeof setTimeout> | undefined
function schedule(ms: number) {
  if (!userId) return
  clearTimeout(timer)
  timer = setTimeout(syncNow, ms)
}

// ---------- An- und Abmelden ----------

let channel: RealtimeChannel | null = null
let interval: ReturnType<typeof setInterval> | undefined
const onVisible = () => document.visibilityState === 'visible' && schedule(0)
const onOnline = () => schedule(0)

function start(session: Session) {
  if (!supabase || userId === session.user.id) return
  stop()
  userId = session.user.id
  channel = supabase
    .channel(`records-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `user_id=eq.${userId}` }, () => schedule(300))
    .subscribe()
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)
  interval = setInterval(() => schedule(0), 5 * 60_000)
  schedule(0)
}

function stop() {
  userId = null
  clearTimeout(timer)
  clearInterval(interval)
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('online', onOnline)
  if (channel) void supabase?.removeChannel(channel)
  channel = null
}

/** Einmal beim Start aufrufen: verfolgt die Anmeldung und startet/stoppt den Sync. */
export function initSync() {
  if (!supabase) {
    void seedIfEmpty().then(seedProducts)
    return
  }
  void seedProducts()
  supabase.auth.onAuthStateChange((_event, session) => {
    setState({ session })
    // Supabase-Aufrufe nicht direkt im Callback (kann sonst blockieren), daher setTimeout
    setTimeout(() => (session ? start(session) : stop()), 0)
  })
}

/** Abmelden: noch offene Änderungen hochladen, dann lokale Daten von diesem Gerät entfernen. */
export async function signOut() {
  if (!supabase) return
  await syncNow()
  const pending = outbox.size
  const msg = pending
    ? `${pending} Änderung(en) konnten noch nicht hochgeladen werden und gehen beim Abmelden verloren. Trotzdem abmelden?`
    : 'Abmelden? Die Daten werden von diesem Gerät entfernt und bleiben in deinem Konto gespeichert.'
  if (!(await confirmDialog(msg, 'Abmelden'))) return
  stop()
  await supabase.auth.signOut({ scope: 'local' })
  outbox.clear()
  for (const k of [K_OUTBOX, K_CURSOR, K_OWNER]) localStorage.removeItem(k)
  await clearLocal()
}
