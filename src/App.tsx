import { Icon } from './components/Icon'
import { useStore } from './store'
import { Capture } from './screens/Capture'
import { EntryEdit } from './screens/EntryEdit'
import { EntryView } from './screens/EntryView'
import { Hiit } from './screens/Hiit'
import { History, SessionDetail } from './screens/History'
import { Library } from './screens/Library'
import { RoutineEdit, Routines } from './screens/Routines'
import { SessionScreen } from './screens/Session'
import { BodyPicker, ExerciseList, RegionScreen } from './screens/StartWorkout'
import { Settings } from './screens/Settings'
import { Today } from './screens/Today'
import type { Route } from './types'

const TABS: { name: Route['name']; label: string; icon: string }[] = [
  { name: 'today', label: 'Today', icon: 'today' },
  { name: 'library', label: 'Library', icon: 'library' },
  { name: 'history', label: 'History', icon: 'history' },
  { name: 'settings', label: 'Settings', icon: 'settings' },
]

const SECTION: Partial<Record<Route['name'], Route['name']>> = {
  entry: 'library',
  edit: 'library',
  routine: 'routines',
  sessionDetail: 'history',
  capture: 'today',
  body: 'today',
  region: 'today',
  exercises: 'today',
  routines: 'today',
  hiit: 'today',
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'today':
      return <Today />
    case 'body':
      return <BodyPicker />
    case 'region':
      return <RegionScreen key={route.region} region={route.region} />
    case 'exercises':
      return <ExerciseList key={route.region + (route.muscle ?? '')} region={route.region} muscle={route.muscle} />
    case 'library':
      return <Library />
    case 'entry':
      return <EntryView key={route.id} id={route.id} />
    case 'edit':
      return <EntryEdit key={route.id ?? 'new'} {...route} />
    case 'capture':
      return <Capture key={(route.inboxId ?? '') + (route.url ?? '')} url={route.url} title={route.title} inboxId={route.inboxId} />
    case 'routines':
      return <Routines />
    case 'routine':
      return <RoutineEdit key={route.id ?? 'new'} id={route.id} type={route.type} />
    case 'session':
      return <SessionScreen />
    case 'hiit':
      return <Hiit routineId={route.routineId} />
    case 'history':
      return <History />
    case 'sessionDetail':
      return <SessionDetail id={route.id} />
    case 'settings':
      return <Settings />
  }
}

export function App() {
  const { ready, route, go, toast, active } = useStore()
  if (!ready) return <div className="boot">Loading your library…</div>
  const section = SECTION[route.name] ?? route.name
  const focus = route.name === 'session'
  return (
    <div className={focus ? 'app focus' : 'app'}>
      <main>
        <Screen route={route} />
      </main>
      {!focus && (
        <nav className="tabbar" aria-label="Main">
          {TABS.map((t) => (
            <button key={t.name} type="button" className={section === t.name ? 'on' : ''} aria-current={section === t.name ? 'page' : undefined} onClick={() => go({ name: t.name } as Route)}>
              <Icon name={t.icon} size={22} />
              {t.label}
              {t.name === 'today' && active && <span className="dot" aria-label="Session in progress" />}
            </button>
          ))}
        </nav>
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
