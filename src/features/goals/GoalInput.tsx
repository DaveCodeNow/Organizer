import { useEffect, useState } from 'react'

/** Kleines Zahlenfeld für Punkteziele („40 P.“); leer = kein Ziel. */
export function GoalInput({ value, onChange, label }: { value: number | undefined; onChange: (n: number | undefined) => void; label: string }) {
  const [text, setText] = useState(value ? String(value) : '')
  useEffect(() => setText(value ? String(value) : ''), [value])
  const commit = () => {
    const n = Math.round(Number(text.replace(',', '.')))
    const next = text.trim() && n > 0 ? Math.min(n, 9999) : undefined
    if (next !== value) onChange(next)
    else setText(value ? String(value) : '')
  }
  return (
    <label className="flex shrink-0 items-center gap-1.5">
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        placeholder="–"
        value={text}
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="h-10 w-16 rounded-full border border-line bg-bg text-center text-[15px] outline-none transition placeholder:text-muted focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10"
      />
      <span className="text-sm text-muted">P.</span>
    </label>
  )
}
