import { useEffect, type ReactNode } from 'react'
import { Check, X } from 'lucide-react'

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  )
}

export function IconButton({
  label,
  onClick,
  children,
  tone = 'plain',
}: {
  label: string
  onClick: () => void
  children: ReactNode
  tone?: 'plain' | 'brand' | 'danger'
}) {
  const tones = {
    plain: 'bg-surface text-ink shadow-card hover:bg-white',
    brand: 'bg-brand text-white shadow-card hover:brightness-105',
    danger: 'text-muted hover:bg-red-50 hover:text-red-600',
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-10 shrink-0 place-items-center rounded-full transition active:scale-95 ${tones[tone]}`}
    >
      {children}
    </button>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className = '',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}) {
  const variants = {
    primary: 'bg-brand text-white hover:brightness-105',
    secondary: 'bg-brand-soft text-brand-ink hover:brightness-[.98]',
    ghost: 'text-muted hover:bg-black/5',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-semibold transition active:scale-[.98] disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

/** Bottom Sheet – fährt von unten herein, wie bei nativen Apps. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] animate-[fade-in_.2s_ease-out]" onClick={onClose} />
      <div
        role="dialog"
        aria-label={title}
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-3xl bg-surface shadow-2xl animate-[sheet-in_.28s_cubic-bezier(.2,.9,.3,1)] sm:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <h2 className="text-lg font-bold">{title}</h2>
          <IconButton label="Schließen" onClick={onClose} tone="danger">
            <X size={20} />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ emoji, title, text, children }: { emoji: string; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="mx-5 mt-8 flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-12 text-center">
      <div className="mb-3 text-5xl">{emoji}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

/** Grundstil für Eingabefelder ohne Höhe/Breite – für Textareas, Selects o. Ä. mit eigener Größe. */
export const fieldClass =
  'rounded-2xl border border-line bg-bg px-4 text-[15px] outline-none transition placeholder:text-muted/70 focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10'

/** Standard-Eingabefeld. Achtung: setzt w-full – feste Breiten über einen Wrapper lösen, nicht per zusätzlicher w-Klasse. */
export const inputClass = `h-11 w-full ${fieldClass}`

/** Beschriftetes Formularfeld. */
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

/** Umschalter mit 2–4 Optionen (z. B. Monat / Quartal / Jahr). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: ReadonlyArray<{ id: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="flex rounded-2xl bg-line/60 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`h-9 flex-1 rounded-xl text-sm font-semibold transition ${o.id === value ? 'bg-surface text-ink shadow-card' : 'text-muted'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Auswahl-Chips in einer horizontal scrollbaren Reihe. */
export function Chips<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T | undefined
  options: ReadonlyArray<{ id: T; label: string }>
  onChange: (v: T) => void
}) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition active:scale-95 ${
            o.id === value ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Runder Abhak-Kreis (nur Anzeige – der umgebende Button übernimmt die Bedienung). */
export function CheckCircle({ checked, small }: { checked: boolean; small?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border-2 transition ${small ? 'size-5' : 'size-6'} ${
        checked ? 'border-brand bg-brand text-white animate-[pop_.25s_ease-out]' : 'border-line'
      }`}
    >
      {checked && <Check size={small ? 12 : 14} strokeWidth={3} />}
    </span>
  )
}

/** Überschrift über einer Kartengruppe, optional mit Aktion rechts. */
export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex min-h-8 items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">{children}</h2>
      {action}
    </div>
  )
}
