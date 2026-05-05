'use client'
import { useState, useEffect, useLayoutEffect } from 'react'
import { Plus, BookOpen, LayoutDashboard, List, Circle, CheckCircle2, ArrowRight, LogOut } from 'lucide-react'
import { loadData, saveData, Project, Task, getActiveTask, completeTask } from '@/lib/store'
import ProjectCard from '@/components/ProjectCard'
import ProjectView from '@/components/ProjectView'
import NewProjectModal from '@/components/NewProjectModal'
import AuthGate from '@/components/AuthGate'
import { Button, CompleteForm } from '@/components/ui'

export default function Home() {
  return (
    <AuthGate>
      {(_user, onSignOut) => <App onSignOut={onSignOut} />}
    </AuthGate>
  )
}

function App({ onSignOut }: { onSignOut: () => void }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [initialTaskId, setInitialTaskId] = useState<string | undefined>(undefined)
  const [showNewProject, setShowNewProject] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [compact, setCompact] = useState(false)
  const [tab, setTab] = useState<'focused' | 'other'>('focused')

  useLayoutEffect(() => { window.scrollTo(0, 0) }, [activeProject])

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
      <div className="max-w-2xl mx-auto px-4 py-10">

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
                  onClick={() => setTab('focused')}
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
                  onClick={() => setTab('other')}
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
                onClick={() => setCompact(v => !v)}
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

function TodayFocusRow({ project, task, onRefresh, onOpen }: { project: Project; task: Task; onRefresh: () => void; onOpen: () => void }) {
  const [completing, setCompleting] = useState(false)

  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-subtle)] transition-colors">
        <button
          className="flex-shrink-0 cursor-pointer"
          onClick={() => setCompleting(v => !v)}
          aria-label="Mark complete"
        >
          {completing ? <CheckCircle2 size={16} className="text-[var(--accent)]" /> : <Circle size={16} className="text-[var(--border-strong)] hover:text-[var(--text-muted)] transition-colors" />}
        </button>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
          <p className="text-xs text-[var(--text-muted)] mb-0.5">{project.title}</p>
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{task.title}</p>
        </div>
        <button
          onClick={onOpen}
          className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Open task"
        >
          <ArrowRight size={14} />
        </button>
      </div>

      {completing && (
        <div className="px-4 pb-4 animate-slide-in border-t border-[var(--border)] pt-3">
          <CompleteForm
            onConfirm={r => { completeTask(task.id, r); setCompleting(false); onRefresh() }}
            onCancel={() => setCompleting(false)}
          />
        </div>
      )}
    </div>
  )
}
