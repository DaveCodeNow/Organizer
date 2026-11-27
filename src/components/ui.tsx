import { useEffect, useRef, type ReactNode } from 'react'
import { Check, X, type LucideIcon } from 'lucide-react'

/** Seitenkopf. Betonte Wörter im Titel als <em> übergeben – sie werden kursiv in der Akzentfarbe gesetzt. */
export function PageHeader({ title, subtitle, action, eyebrow }: { title: ReactNode; subtitle?: string; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 px-5 pt-[max(2rem,calc(env(safe-area-inset-top)+1rem))] pb-5">
      <div className="min-w-0">
        {eyebrow && <div className="mb-3">{eyebrow}</div>}
        <h1 className="font-serif text-[34px] leading-[1.1] font-normal tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
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
  disabled,
}: {
  label: string
  onClick: () => void
  children: ReactNode
  tone?: 'plain' | 'brand' | 'danger'
  disabled?: boolean
}) {
  const tones = {
    plain: 'border border-line bg-surface text-ink hover:bg-bg',
    brand: 'bg-brand text-surface hover:brightness-105',
    danger: 'text-muted hover:bg-warn-soft hover:text-warn',
  }
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid size-10 shrink-0 place-items-center rounded-full transition active:scale-95 disabled:opacity-35 ${tones[tone]}`}
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
    primary: 'bg-brand text-surface hover:brightness-105',
    secondary: 'bg-brand-soft text-brand-ink hover:brightness-[.98]',
    ghost: 'text-muted hover:bg-bg',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-semibold transition active:scale-[.98] disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// Zählt offene Sheets, damit beim Schließen eines oberen Sheets das Scrollen gesperrt bleibt
let openSheets = 0

/** Bottom Sheet – fährt von unten herein, wie bei nativen Apps. Kann über einem anderen Sheet liegen. */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const openedAt = useRef(0)
  useEffect(() => {
    if (open) openedAt.current = Date.now()
  }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    openSheets++
    return () => {
      window.removeEventListener('keydown', onKey)
      if (--openSheets === 0) document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Klicks direkt nach dem Öffnen ignorieren: sonst schließt das Loslassen nach langem Drücken das Sheet gleich wieder */}
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px] animate-[fade-in_.2s_ease-out]" onClick={() => Date.now() - openedAt.current > 400 && onClose()} />
      <div
        role="dialog"
        aria-label={title}
        className="relative flex max-h-[90dvh] w-full max-w-lg flex-col rounded-t-[2rem] bg-surface animate-[sheet-in_.28s_cubic-bezier(.2,.9,.3,1)] sm:rounded-3xl"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line" aria-hidden />
        <div className="flex items-center justify-between px-5 pt-2 pb-2">
          <h2 className="font-serif text-[22px] leading-[1.1] font-[600]">{title}</h2>
          <IconButton label="Schließen" onClick={onClose} tone="danger">
            <X size={20} />
          </IconButton>
        </div>
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return (
    <div className="mx-5 mt-8 flex flex-col items-center rounded-3xl bg-surface/60 px-6 py-12 text-center">
      <div className="mb-4 grid size-16 place-items-center rounded-full bg-sand text-brand">
        <Icon size={28} strokeWidth={1.75} />
      </div>
      <h3 className="font-serif text-xl leading-[1.1] font-[600]">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}

const fieldBase =
  'border border-line bg-bg px-4 text-[15px] outline-none transition placeholder:text-muted focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10'

/** Grundstil für Eingabefelder ohne Höhe/Breite – für Textareas, Selects o. Ä. mit eigener Größe. */
export const fieldClass = `rounded-2xl ${fieldBase}`

/** Standard-Eingabefeld in Pillenform. Achtung: setzt w-full – feste Breiten über einen Wrapper lösen, nicht per zusätzlicher w-Klasse. */
export const inputClass = `h-11 w-full rounded-full ${fieldBase}`

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
    <div className="flex rounded-full bg-sand/70 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`h-9 flex-1 rounded-full text-sm font-semibold transition ${o.id === value ? 'bg-surface text-ink' : 'text-ink/75'}`}
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
  trailing,
}: {
  value: T | undefined
  options: ReadonlyArray<{ id: T; label: ReactNode }>
  onChange: (v: T) => void
  /** Zusätzliches Element am Ende der Reihe (z. B. Datumsauswahl) */
  trailing?: ReactNode
}) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition active:scale-95 ${
            o.id === value ? 'border-brand bg-brand-soft text-brand-ink' : 'border-line bg-surface text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
      {trailing}
    </div>
  )
}

/** Runder Abhak-Kreis (nur Anzeige – der umgebende Button übernimmt die Bedienung). */
export function CheckCircle({ checked, small }: { checked: boolean; small?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full border-2 transition ${small ? 'size-5' : 'size-6'} ${
        checked ? 'border-brand bg-brand text-surface animate-[pop_.25s_ease-out]' : 'border-caramel'
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
      <h2 className="flex items-center gap-2 font-serif text-[19px] leading-[1.1] font-[600]">{children}</h2>
      {action}
    </div>
  )
}

/** Ein- und Ausschalter (nur Anzeige – der umgebende Button übernimmt die Bedienung). */
export function Switch({ on }: { on: boolean }) {
  return (
    <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-brand' : 'bg-caramel'}`} aria-hidden>
      <span className={`absolute top-1 left-1 size-5 rounded-full bg-surface transition-transform ${on ? 'translate-x-5' : ''}`} />
    </span>
  )
}

/** Eintrag in einem Menü-Sheet */
export function MenuItem({ icon, label, onClick, danger, disabled }: { icon: ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-3 rounded-full px-4 py-3.5 text-left text-[15px] font-medium transition hover:bg-bg disabled:opacity-35 ${
        danger ? 'text-warn' : ''
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
