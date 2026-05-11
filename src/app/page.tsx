'use client'
import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import { Plus, BookOpen, LayoutDashboard, List, LogOut } from 'lucide-react'
import { loadData, saveData, Project, Task, getActiveTask, completeTask } from '@/lib/store'
import { subscribeToChanges } from '@/lib/supabase'
import ProjectCard from '@/components/ProjectCard'
import ProjectView from '@/components/ProjectView'
import NewProjectModal from '@/components/NewProjectModal'
import AuthGate from '@/components/AuthGate'
import { Button, CompleteForm } from '@/components/ui'

export default function Home() {
  return (
    <AuthGate>
      {(user, onSignOut) => <App userId={user.id} onSignOut={onSignOut} />}
    </AuthGate>
  )
}

function App({ userId, onSignOut }: { userId: string; onSignOut: () => void }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [initialTaskId, setInitialTaskId] = useState<string | undefined>(undefined)
  const [showNewProject, setShowNewProject] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [compact, setCompact] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('mastery-compact-view') === 'true'
  })
  const [tab, setTab] = useState<'focused' | 'other'>(() => {
    if (typeof window === 'undefined') return 'focused'
    const saved = localStorage.getItem('mastery-project-tab')
    return saved === 'other' ? 'other' : 'focused'
  })

  useEffect(() => { window.scrollTo(0, 0) }, [activeProject])

  const refreshRef = useRef(refresh)
  useEffect(() => { refreshRef.current = refresh })

  useEffect(() => {
    const channel = subscribeToChanges(userId, () => refreshRef.current())
    return () => { channel.unsubscribe() }
  }, [userId])

  // Sync across tabs on the same device via the native storage event
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'mastery-app-v1') refreshRef.current()
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  // Re-read localStorage after AuthGate finishes syncing from Supabase on login
  useEffect(() => {
    function handleSync() { refreshRef.current() }
    window.addEventListener('mastery-data-synced', handleSync)
    return () => window.removeEventListener('mastery-data-synced', handleSync)
  }, [])

  useEffect(() => {
    setMounted(true)
    const data = loadData()
    // Auto-focus the mastery app project if no projects have been manually focused yet
    const anyFocused = data.projects.some(p => p.focused)
    if (!anyFocused) {
      const masteryIdx = data.projects.findIndex(p =>
        p.title.toLowerCase().includes('mastery') || p.title.toLowerCase().includes('mastery app')
      )
      if (masteryIdx !== -1) {
        data.projects[masteryIdx] = { ...data.projects[masteryIdx], focused: true }
        saveData(data)
      }
    }
    const filtered = data.projects.filter(p => !p.archivedAt)
    setProjects(filtered)
    const hash = window.location.hash.slice(1)
    if (hash) {
      const project = filtered.find(p => p.id === hash)
      if (project) setActiveProject(project)
    }
  }, [])

  function refresh() {
    const data = loadData()
    setProjects(data.projects.filter(p => !p.archivedAt))
    if (activeProject) {
      const updated = data.projects.find(p => p.id === activeProject.id)
      if (updated) setActiveProject(updated)
    }
  }

  function goBack() {
    setActiveProject(null)
    setInitialTaskId(undefined)
    window.location.hash = ''
    const data = loadData()
    setProjects(data.projects.filter(p => !p.archivedAt))
  }

  if (!mounted) return null

  // Project detail view
  if (activeProject) {
    return (
      <ProjectView
        project={activeProject}
        onBack={goBack}
        onUpdate={refresh}
        initialTaskId={initialTaskId}
        onInitialTaskBack={initialTaskId ? goBack : undefined}
      />
    )
  }

  // Dashboard
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-10 animate-fade-up">
          <div>
            <h1 className="text-4xl" style={{ fontFamily: 'var(--font-display)' }}>Mastery</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">One task per project. Every day.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => setShowNewProject(true)}>
              <Plus size={14} /> New project
            </Button>
            <button
              onClick={onSignOut}
              className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Today's focus strip */}
        {projects.length > 0 && <TodayStrip projects={projects.filter(p => p.focused)} onRefresh={refresh} onOpenTask={(project, taskId) => { setInitialTaskId(taskId); setActiveProject(project); window.location.hash = project.id }} />}

        {/* Project grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center animate-fade-up">
            <BookOpen size={32} className="text-[var(--text-muted)]" />
            <div>
              <p className="text-lg font-medium" style={{ fontFamily: 'var(--font-display)' }}>No projects yet</p>
              <p className="text-sm text-[var(--text-muted)] mt-1 max-w-xs">Start by creating a project — a hobby, skill, or goal you want to work on consistently.</p>
            </div>
            <Button variant="primary" onClick={() => setShowNewProject(true)}>
              <Plus size={14} /> Create your first project
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 animate-fade-up-delay">
            {/* Tabs */}
            <div className="flex items-center gap-3">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-medium flex-shrink-0">Projects</p>
              <div className="flex gap-1 p-1 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)]">
                <button
                  onClick={() => { setTab('focused'); localStorage.setItem('mastery-project-tab', 'focused') }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${tab === 'focused' ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                  Focused
                  {projects.filter(p => p.focused).length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === 'focused' ? 'bg-[var(--amber-light)] text-[var(--amber)]' : 'bg-[var(--border)] text-[var(--text-muted)]'}`}>
                      {projects.filter(p => p.focused).length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => { setTab('other'); localStorage.setItem('mastery-project-tab', 'other') }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-sm)] text-xs font-medium transition-colors ${tab === 'other' ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                  Other
                  {projects.filter(p => !p.focused).length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${tab === 'other' ? 'bg-[var(--bg-subtle)] text-[var(--text-muted)]' : 'bg-[var(--border)] text-[var(--text-muted)]'}`}>
                      {projects.filter(p => !p.focused).length}
                    </span>
                  )}
                </button>
              </div>
              <button
                onClick={() => setCompact(v => { const next = !v; localStorage.setItem('mastery-compact-view', String(next)); return next })}
                className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors ml-auto"
                title={compact ? 'Full view' : 'Compact view'}
              >
                {compact ? <LayoutDashboard size={13} /> : <List size={13} />}
                {compact ? 'Full' : 'Compact'}
              </button>
            </div>
            {(() => {
              const visible = tab === 'focused' ? projects.filter(p => p.focused) : projects.filter(p => !p.focused)
              if (visible.length === 0) {
                return (
                  <p className="text-sm text-[var(--text-muted)] italic py-6 text-center">
                    {tab === 'focused' ? 'No focused projects — click the flame icon on a project to focus it.' : 'All projects are focused.'}
                  </p>
                )
              }
              return visible.map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onUpdate={refresh}
                  onOpen={() => { setActiveProject(p); window.location.hash = p.id }}
                  compact={compact}
                />
              ))
            })()}
          </div>
        )}
      </div>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={() => { refresh(); setTab('focused') }}
        />
      )}
    </div>
  )
}

// Strip showing today's active tasks across all projects
function TodayStrip({ projects, onRefresh, onOpenTask }: { projects: Project[]; onRefresh: () => void; onOpenTask: (project: Project, taskId: string) => void }) {
  const activeTasks = projects
    .map(p => ({ project: p, task: getActiveTask(p.id) }))
    .filter((x): x is { project: Project; task: Task } => x.task != null)

  if (activeTasks.length === 0) return null

  return (
    <div className="mb-8 animate-fade-up">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-medium mb-3">Today's focus</p>
      <div className="flex flex-col gap-2">
        {activeTasks.map(({ project, task }) => (
          <TodayFocusRow key={task.id} project={project} task={task} onRefresh={onRefresh} onOpen={() => onOpenTask(project, task.id)} />
        ))}
      </div>
    </div>
  )
}

// Derive a stable accent color per project from its id
const PROJECT_COLORS = ['#2D6A4F', '#6366F1', '#D97706', '#DB2777', '#0891B2', '#7C3AED', '#059669']
function projectColor(project: Project): string {
  let h = 0
  for (let i = 0; i < project.id.length; i++) h = (h * 31 + project.id.charCodeAt(i)) >>> 0
  return PROJECT_COLORS[h % PROJECT_COLORS.length]
}

function TodayFocusRow({ project, task, onRefresh, onOpen }: { project: Project; task: Task; onRefresh: () => void; onOpen: () => void }) {
  const color = projectColor(project)
  // checked: checkbox ticked, animating out; showForm: legacy confirm expand
  const [checked, setChecked] = useState(false)
  const [rippling, setRippling] = useState(false)
  const [gone, setGone] = useState(false)
  const [hovered, setHovered] = useState(false)

  const handleCheck = useCallback(() => {
    if (checked) return
    setChecked(true)
    setRippling(true)
    // fade the row out after 1.2s total, then actually complete
    setTimeout(() => {
      setGone(true)
      setTimeout(() => {
        completeTask(task.id, '')
        onRefresh()
      }, 420)
    }, 1200)
  }, [checked, task.id, onRefresh])

  if (gone) return null

  return (
    <div
      className={`rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden transition-colors${checked ? ' task-card-bounce' : ' hover:border-[var(--border-strong)]'}${gone ? ' task-row-fadeout' : ''}`}
      style={gone ? { overflow: 'hidden', animation: 'rowFadeOut 400ms ease forwards' } : undefined}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          className="flex-shrink-0 cursor-pointer focus:outline-none"
          onClick={handleCheck}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          aria-label="Mark complete"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', overflow: 'visible' }}>
            {/* Ripple ring — fires on check */}
            {rippling && (
              <circle
                cx="9" cy="9" r="7"
                fill="none"
                stroke={color}
                strokeWidth="2"
                className="task-ripple"
                onAnimationEnd={() => setRippling(false)}
              />
            )}
            {/* Outer ring */}
            <circle
              cx="9" cy="9" r="7.5"
              stroke={checked ? color : hovered ? color : 'var(--border-strong)'}
              strokeWidth="1.5"
              fill={checked ? color : hovered ? `${color}33` : 'none'}
              style={{ transition: 'stroke 160ms, fill 160ms' }}
            />
            {/* Checkmark — only when checked */}
            {checked && (
              <polyline
                points="5.5,9 8,11.5 12.5,6.5"
                stroke="white"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                className="task-check-draw"
              />
            )}
          </svg>
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
          <p className="text-xs mb-0.5" style={{ color: checked ? color : 'var(--text-muted)', transition: 'color 200ms' }}>{project.title}</p>
          <p className={`text-sm font-medium truncate transition-colors${checked ? ' line-through' : ''}`} style={{ color: checked ? 'var(--text-muted)' : 'var(--text-primary)', transition: 'color 200ms, text-decoration 200ms' }}>{task.title}</p>
        </div>
      </div>
    </div>
  )
}
