import { useEffect, useState, type ComponentType } from 'react'
import { LayoutDashboard, ShoppingCart, Target, type LucideIcon } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './lib/db'
import { today } from './lib/dates'
import { onNavigate } from './lib/nav'
import { supabase } from './lib/supabase'
import { useSync } from './lib/sync'
import { Toaster } from './components/Toast'
import { Confirmer } from './components/Confirm'
import Overview from './features/overview/Overview'
import ShoppingList from './features/shopping/ShoppingList'
import GoalsTodos from './features/goals/GoalsTodos'
import AuthScreen from './features/account/AuthScreen'

// Neue Module (z. B. Putzplan) bekommen hier einfach einen weiteren Tab.
const TABS = [
  { id: 'overview', label: 'Übersicht', icon: LayoutDashboard, Page: Overview },
  { id: 'goals', label: 'Ziele & To-dos', icon: Target, Page: GoalsTodos },
  { id: 'list', label: 'Einkauf', icon: ShoppingCart, Page: ShoppingList },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: LucideIcon; Page: ComponentType }>

type TabId = (typeof TABS)[number]['id']
const isTab = (t: unknown): t is TabId => TABS.some((x) => x.id === t)

function readTab(): TabId {
  try {
    const t = localStorage.getItem('tab')
    if (isTab(t)) return t
  } catch {}
  return 'overview'
}

export default function App() {
  const [tab, setTab] = useState<TabId>(readTab)
  const openCount = useLiveQuery(() => db.listItems.filter((i) => !i.checked).count(), [], 0)
  const t = today()
  const dueCount = useLiveQuery(() => db.todos.filter((x) => !x.done && !!x.due && x.due <= t).count(), [t], 0)
  const badges: Partial<Record<TabId, number>> = { list: openCount, goals: dueCount }
  const { Page } = TABS.find((x) => x.id === tab)!

  const go = (id: TabId) => {
    setTab(id)
    window.scrollTo({ top: 0 })
    try {
      localStorage.setItem('tab', id)
    } catch {}
  }

  useEffect(() => onNavigate((id) => isTab(id) && go(id)), [])

  // Mit Supabase-Konfiguration ist eine Anmeldung nötig; ohne läuft die App rein lokal.
  const { session } = useSync()
  if (supabase && session === undefined) return null
  if (supabase && !session)
    return (
      <>
        <AuthScreen />
        <Toaster />
        <Confirmer />
      </>
    )

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <main key={tab} className="animate-[fade-in_.2s_ease-out]">
        <Page />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = id === tab
            const badge = badges[id] ?? 0
            return (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                className={`relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-medium transition ${
                  active ? 'text-brand' : 'text-muted'
                }`}
              >
                <span className={`grid h-8 w-14 place-items-center rounded-full transition ${active ? 'bg-brand-soft' : ''}`}>
                  <Icon size={21} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                {label}
                {badge > 0 && (
                  <span
                    className={`absolute top-0 left-1/2 ml-3 min-w-5 rounded-full px-1.5 text-[10px] leading-5 text-surface ${id === 'goals' ? 'bg-warn' : 'bg-brand'}`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
      <Toaster />
      <Confirmer />
    </div>
  )
}
