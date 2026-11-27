import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { db } from '../../lib/db'
import { inputClass } from '../../components/ui'

/** „ #Master  projekt “ → „Master projekt“ */
export const normTag = (s: string) => s.trim().replace(/^#+/, '').replace(/\s+/g, ' ')

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** Passt der Eintrag zum Filter? (kein Filter = alles passt; Groß-/Kleinschreibung egal) */
export const hasTag = (item: { tags?: string[] }, tag: string | null) => !tag || !!item.tags?.some((t) => same(t, tag))

const HASHTAG = /#([\p{L}\p{N}_-]+)/gu

/** „Paper lesen #Masterprojekt“ → { title: "Paper lesen", tags: ["Masterprojekt"] }. Schreibweise bekannter Tags wird übernommen. */
export function extractTags(text: string, known: string[]) {
  const tags: string[] = []
  for (const [, raw] of text.matchAll(HASHTAG)) {
    const t = known.find((k) => same(k, raw)) ?? raw
    if (!tags.some((x) => same(x, t))) tags.push(t)
  }
  return { title: text.replace(HASHTAG, '').replace(/\s+/g, ' ').trim(), tags }
}

/** Fügt Tags ohne Duplikate (Groß-/Kleinschreibung egal) zusammen. */
export const mergeTags = (...lists: string[][]) =>
  lists.flat().reduce<string[]>((acc, t) => (acc.some((x) => same(x, t)) ? acc : [...acc, t]), [])

/** Alle Tags aus Zielen und To-dos, alphabetisch. Tags verschwinden automatisch, wenn kein Eintrag sie mehr nutzt. */
export function useAllTags() {
  return useLiveQuery(
    async () => {
      const [goals, todos] = await Promise.all([db.goals.toArray(), db.todos.toArray()])
      const byKey = new Map<string, string>()
      for (const x of [...goals, ...todos]) for (const t of x.tags ?? []) if (!byKey.has(t.toLowerCase())) byKey.set(t.toLowerCase(), t)
      return [...byKey.values()].sort((a, b) => a.localeCompare(b, 'de'))
    },
    [],
    [] as string[],
  )
}

/** Kleine Tag-Plaketten zur Anzeige. `hide` blendet den gerade gefilterten Tag aus (wäre überall gleich). */
export function TagList({ tags, hide, className = '' }: { tags?: string[]; hide?: string | null; className?: string }) {
  const shown = (tags ?? []).filter((t) => !hide || !same(t, hide))
  if (shown.length === 0) return null
  return (
    <span className={`flex flex-wrap gap-1 ${className}`}>
      {shown.map((t) => (
        <span key={t} className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] leading-4 font-medium text-brand-ink">
          #{t}
        </span>
      ))}
    </span>
  )
}

/** Tags auswählen (Mehrfachauswahl) oder neue anlegen – für Editoren von Zielen und To-dos. */
export function TagPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const all = useAllTags()
  const [text, setText] = useState('')

  // Bekannte Tags plus neu angelegte, die noch nicht gespeichert sind
  const options = [...all, ...value.filter((v) => !all.some((a) => same(a, v)))]
  const isOn = (t: string) => value.some((v) => same(v, t))
  const toggle = (t: string) => onChange(isOn(t) ? value.filter((v) => !same(v, t)) : [...value, t])

  const add = () => {
    const t = normTag(text)
    if (!t) return
    const existing = options.find((o) => same(o, t)) ?? t
    if (!isOn(existing)) onChange([...value, existing])
    setText('')
  }

  return (
    <div className="space-y-2">
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {options.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggle(t)}
              aria-pressed={isOn(t)}
              className={`h-9 rounded-full border px-3.5 text-sm font-medium transition active:scale-95 ${
                isOn(t) ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-muted'
              }`}
            >
              #{t}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={add}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Eigenen Tag eingeben, z. B. Masterprojekt"
          aria-label="Neuer Tag"
          enterKeyHint="enter"
          className={inputClass}
        />
        <button
          type="button"
          aria-label="Tag hinzufügen"
          onClick={add}
          disabled={!normTag(text)}
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-ink transition active:scale-95 disabled:opacity-40"
        >
          <Plus size={20} />
        </button>
      </div>
      <p className="text-xs text-muted">
        {options.length ? 'Tippe Tags an, um sie zuzuordnen, oder lege einen neuen an.' : 'Noch keine Tags – einfach einen Namen eingeben und mit ＋ bestätigen.'}
      </p>
    </div>
  )
}
