import { useState, type ComponentType } from 'react'
import { BookOpen, Bookmark, ShoppingCart, type LucideIcon } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './lib/db'
import { Toaster } from './components/Toast'
import ShoppingList from './features/shopping/ShoppingList'
import Recipes from './features/recipes/Recipes'
import Templates from './features/templates/Templates'

// Neue Module (z. B. Aufgaben, Budget) bekommen hier einfach einen weiteren Tab.
const TABS = [
  { id: 'list', label: 'Einkauf', icon: ShoppingCart, Page: ShoppingList },
  { id: 'recipes', label: 'Rezepte', icon: BookOpen, Page: Recipes },
  { id: 'templates', label: 'Listen', icon: Bookmark, Page: Templates },
] as const satisfies ReadonlyArray<{ id: string; label: string; icon: LucideIcon; Page: ComponentType }>

type TabId = (typeof TABS)[number]['id']

function readTab(): TabId {
  try {
    const t = localStorage.getItem('tab')
    if (TABS.some((x) => x.id === t)) return t as TabId
  } catch {}
  return 'list'
}

export default function App() {
  const [tab, setTab] = useState<TabId>(readTab)
  const openCount = useLiveQuery(() => db.listItems.filter((i) => !i.checked).count(), [], 0)
  const { Page } = TABS.find((t) => t.id === tab)!

  const go = (id: TabId) => {
    setTab(id)
    window.scrollTo({ top: 0 })
    try {
      localStorage.setItem('tab', id)
    } catch {}
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
      <main key={tab} className="animate-[fade-in_.2s_ease-out]">
        <Page />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-lg px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = id === tab
            return (
              <button
                key={id}
                type="button"
                onClick={() => go(id)}
                className={`relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-semibold transition ${
                  active ? 'text-brand' : 'text-muted'
                }`}
              >
                <span className={`grid h-8 w-14 place-items-center rounded-full transition ${active ? 'bg-brand-soft' : ''}`}>
                  <Icon size={21} strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
                {id === 'list' && openCount > 0 && (
                  <span className="absolute top-0 left-1/2 ml-3 min-w-5 rounded-full bg-brand px-1.5 text-[10px] leading-5 text-white">
                    {openCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
      <Toaster />
    </div>
  )
}
