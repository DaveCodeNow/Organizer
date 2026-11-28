import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChartNoAxesColumn, MoreHorizontal, Shapes, Sparkles, Target } from 'lucide-react'
import { db } from '../../lib/db'
import { startOfWeek, today } from '../../lib/dates'
import { IconButton, MenuItem, PageHeader, Segmented, Sheet, Switch } from '../../components/ui'
import { Todos } from './Todos'
import { Goals } from './Goals'
import { Habits } from './Habits'
import { CategoryManager } from './CategoryManager'
import { CategoriesContext, useCategoriesQuery } from './categories'
import { ReportSheet } from './PointsUI'
import { LEVELS, LEVEL_POINTS, updatePointsSettings, usePointsSettings } from './points'
import { GoalInput } from './GoalInput'
import { isPlanned } from './repeat'

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
  const [managing, setManaging] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const points = usePointsSettings()
  const cats = useCategoriesQuery()

  const t = today()
  const subtitle = useLiveQuery(async () => {
    const open = await db.todos.filter((x) => !x.done && !x.archived && !isPlanned(x, t)).toArray()
    const due = open.filter((x) => x.due && x.due <= t).length
    const goals = await db.goals.filter((g) => !g.done).count()
    return `${due ? `${due} fällig` : `${open.length} offen`} · ${goals} ${goals === 1 ? 'Ziel' : 'Ziele'}`
  }, [t])

  const changeView = (v: View) => {
    setView(v)
    write('goalsView', v)
  }

  return (
    <CategoriesContext.Provider value={cats}>
      <PageHeader
        title={<>Ziele &amp; <em>To-dos</em></>}
        subtitle={subtitle}
        action={
          <div className="flex gap-2">
            <IconButton label="Kategorien verwalten" onClick={() => setManaging(true)}>
              <Shapes size={19} />
            </IconButton>
            <IconButton label="Mehr" onClick={() => setMenuOpen(true)}>
              <MoreHorizontal size={20} />
            </IconButton>
          </div>
        }
      />
      <div className="space-y-3 px-5 pb-2">
        <Segmented value={view} options={VIEWS} onChange={changeView} />
      </div>
      {view === 'todos' && <Todos onReport={setReport} />}
      {view === 'goals' && <Goals category={null} />}
      {view === 'habits' && <Habits category={null} />}
      {managing && <CategoryManager onClose={() => setManaging(false)} />}
      <ReportSheet week={report} onClose={() => setReport(null)} />

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Ziele & To-dos">
        <div className="space-y-1 pb-2">
          <button
            type="button"
            role="switch"
            aria-checked={points.enabled}
            onClick={() => updatePointsSettings({ enabled: !points.enabled })}
            className="flex w-full items-center gap-3 rounded-full px-4 py-3.5 text-left text-[15px] font-medium transition hover:bg-bg"
          >
            <Sparkles size={20} className="shrink-0 text-brand" />
            <span className="flex-1">
              Punkte für To-dos
              <span className="block text-xs font-normal text-muted">Beim Anlegen wählbar: {LEVELS.map((l) => `${l.label} ${LEVEL_POINTS[l.id]}`).join(' · ')}</span>
            </span>
            <Switch on={points.enabled} />
          </button>
          {points.enabled && (
            <>
              <div className="flex items-center gap-3 px-4 py-2">
                <Target size={20} className="shrink-0 text-brand" />
                <span className="flex-1 text-[15px] font-medium">
                  Wochenziel
                  <span className="block text-xs font-normal text-muted">Punkte pro Woche, alle Kategorien</span>
                </span>
                <GoalInput value={points.weeklyGoal} onChange={(n) => updatePointsSettings({ weeklyGoal: n })} label="Wochenziel in Punkten" />
              </div>
              <MenuItem
                icon={<Shapes size={20} />}
                label="Wochenziele pro Kategorie"
                onClick={() => {
                  setMenuOpen(false)
                  setManaging(true)
                }}
              />
              <MenuItem
                icon={<ChartNoAxesColumn size={20} />}
                label="Wochenrückblicke"
                onClick={() => {
                  setMenuOpen(false)
                  setReport(startOfWeek())
                }}
              />
            </>
          )}
        </div>
      </Sheet>
    </CategoriesContext.Provider>
  )
}
