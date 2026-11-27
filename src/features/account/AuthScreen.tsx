import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import { Button, Field, Segmented, inputClass } from '../../components/ui'

type Mode = 'login' | 'signup'

const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-Mail oder Passwort ist falsch.',
  'Email not confirmed': 'Bitte bestätige zuerst deine E-Mail-Adresse (Link in der Mail).',
  'User already registered': 'Für diese E-Mail gibt es schon ein Konto – melde dich an.',
}
const translate = (m: string) =>
  MESSAGES[m] ?? (m.includes('Password should be') ? 'Das Passwort muss mindestens 6 Zeichen haben.' : m)

/** Anmeldung bzw. Registrierung per E-Mail und Passwort (funktioniert auch in der installierten PWA, anders als Magic Links). */
export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError('')
    setInfo('')
    const creds = { email: email.trim(), password }
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword(creds)
      if (error) setError(translate(error.message))
    } else {
      const { data, error } = await supabase.auth.signUp({
        ...creds,
        options: { emailRedirectTo: location.origin + import.meta.env.BASE_URL },
      })
      if (error) setError(translate(error.message))
      else if (!data.session) {
        setInfo('Fast geschafft: Wir haben dir eine E-Mail geschickt. Bestätige den Link darin und melde dich dann hier an.')
        setMode('login')
      }
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="mb-8 text-center">
        <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="mx-auto mb-6 size-16" />
        <h1 className="font-serif text-[38px] leading-[1.1] font-normal tracking-tight">
          Willkommen <em>zuhause</em>
        </h1>
        <p className="mt-3 text-sm text-muted">Melde dich an, um deine Daten auf allen Geräten zu haben.</p>
      </div>

      <form onSubmit={submit} className="space-y-4 rounded-[2rem] bg-surface p-6">
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m)
            setError('')
          }}
          options={[
            { id: 'login', label: 'Anmelden' },
            { id: 'signup', label: 'Registrieren' },
          ]}
        />
        <Field label="E-Mail">
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Passwort" hint={mode === 'signup' ? 'Mindestens 6 Zeichen' : undefined}>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        {error && <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">{error}</p>}
        {info && <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm text-brand-ink">{info}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Einen Moment …' : mode === 'login' ? 'Anmelden' : 'Konto erstellen'}
        </Button>
      </form>
    </div>
  )
}
