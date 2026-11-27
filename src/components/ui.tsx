import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

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

export const inputClass =
  'h-11 w-full rounded-2xl border border-line bg-bg px-4 text-[15px] outline-none transition placeholder:text-muted/70 focus:border-brand focus:bg-surface focus:ring-4 focus:ring-brand/10'
