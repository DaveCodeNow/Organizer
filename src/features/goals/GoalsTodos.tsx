import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Shapes } from 'lucide-react'
import { db } from '../../lib/db'
import { today } from '../../lib/dates'
import { Chips, IconButton, PageHeader, Segmented } from '../../components/ui'
import { Todos } from './Todos'
import { Goals } from './Goals'
import { Habits } from './Habits'
import { CategoryManager } from './CategoryManager'
import { CategoriesContext, CategoryTag, useCategoriesQuery } from './categories'

const VIEWS = [
  { id: 'todos', label: 'To-dos' },
  { id: 'goals', label: 'Ziele' },
  { id: 'habits', label: 'Habits' },
] as const
type View = (typeof VIEWS)[number]['id']
const isView = (v: unknown): v is View => VIEWS.some((x) => x.id === v)

function read(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {}
}

export default function GoalsTodos() {
  const [view, setView] = useState<View>(() => {
    const v = read('goalsView')
    return isView(v) ? v : 'todos'
  })
  const [filter, setFilter] = useState<string | null>(() => read('goalsCategory'))
  const [managing, setManaging] = useState(false)
  const cats = useCategoriesQuery()
  // Gibt es die gemerkte Kategorie nicht mehr, gilt wieder „Alle“.
  const category = filter && cats.some((c) => c.id === filter) ? filter : null

  const t = today()
  const subtitle = useLiveQuery(async () => {
    const open = await db.todos.filter((x) => !x.done).toArray()
    const due = open.filter((x) => x.due && x.due <= t).length
    const goals = await db.goals.filter((g) => !g.done).count()
    return `${due ? `${due} fällig` : `${open.length} offen`} · ${goals} ${goals === 1 ? 'Ziel' : 'Ziele'}`
  }, [t])

  const changeView = (v: View) => {
    setView(v)
    write('goalsView', v)
  }
  const changeCategory = (id: string) => {
    const next = id || null
    setFilter(next)
    write('goalsCategory', next)
  }

  return (
    <CategoriesContext.Provider value={cats}>
      <PageHeader
        title={<>Ziele &amp; <em>To-dos</em></>}
        subtitle={subtitle}
        action={
          <IconButton label="Kategorien verwalten" onClick={() => setManaging(true)}>
            <Shapes size={19} />
          </IconButton>
        }
      />
      <div className="space-y-3 px-5 pb-2">
        <Segmented value={view} options={VIEWS} onChange={changeView} />
        {cats.length > 0 && (
          <Chips value={category ?? ''} options={[{ id: '', label: 'Alle' }, ...cats.map((c) => ({ id: c.id, label: <CategoryTag cat={c} size={14} /> }))]} onChange={changeCategory} />
        )}
      </div>
      {view === 'todos' && <Todos category={category} />}
      {view === 'goals' && <Goals category={category} />}
      {view === 'habits' && <Habits category={category} />}
      {managing && <CategoryManager onClose={() => setManaging(false)} />}
    </CategoriesContext.Provider>
  )
}
