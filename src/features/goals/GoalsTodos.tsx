import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../lib/db'
import { today } from '../../lib/dates'
import { Chips, PageHeader, Segmented } from '../../components/ui'
import { Todos } from './Todos'
import { Goals } from './Goals'
import { useAllTags } from './tags'

type View = 'todos' | 'goals'

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
  const [view, setView] = useState<View>(() => (read('goalsView') === 'goals' ? 'goals' : 'todos'))
  const [filter, setFilter] = useState<string | null>(() => read('goalsTag'))
  const tags = useAllTags()
  // Gibt es den gemerkten Tag nicht mehr (alle Einträge gelöscht), gilt wieder „Alle“.
  const tag = filter && tags.some((t) => t.toLowerCase() === filter.toLowerCase()) ? filter : null

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
  const changeTag = (v: string) => {
    const next = v || null
    setFilter(next)
    write('goalsTag', next)
  }

  return (
    <>
      <PageHeader title="Ziele & To-dos" subtitle={subtitle} />
      <div className="space-y-3 px-5 pb-2">
        <Segmented
          value={view}
          options={[
            { id: 'todos', label: 'To-dos' },
            { id: 'goals', label: 'Ziele' },
          ]}
          onChange={changeView}
        />
        {tags.length > 0 && (
          <Chips value={tag ?? ''} options={[{ id: '', label: 'Alle' }, ...tags.map((x) => ({ id: x, label: `#${x}` }))]} onChange={changeTag} />
        )}
      </div>
      {view === 'todos' ? <Todos tag={tag} /> : <Goals tag={tag} />}
    </>
  )
}
