'use client'
import { useState, useRef } from 'react'
import { CheckCircle2, Circle, Flame } from 'lucide-react'
import { Project, Task, getActiveTask, getQueuedTasks, getCompletedTasks, completeTask, toggleProjectFocus } from '@/lib/store'
import { Button, Badge, Divider, CompleteForm } from './ui'

interface Props {
  project: Project
  onUpdate: () => void
  onOpen: () => void
  compact?: boolean
}

export default function ProjectCard({ project, onUpdate, onOpen, compact = false }: Props) {
  const active = getActiveTask(project.id)
  const queued = getQueuedTasks(project.id)
  const done = getCompletedTasks(project.id)
  const total = (active ? 1 : 0) + queued.length + done.length
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const pointerInside = useRef(false)

  const hoverProps = {
    onPointerEnter: () => { pointerInside.current = true; setHovered(true) },
    onPointerLeave: () => { pointerInside.current = false; setHovered(false); setPressed(false) },
    onPointerDown: () => { if (pointerInside.current) setPressed(true) },
    onPointerUp: () => setPressed(false),
    onPointerCancel: () => { setHovered(false); setPressed(false) },
  }

  const bgClass = pressed || hovered ? 'bg-[var(--bg-subtle)]' : 'bg-[var(--bg-card)]'

  function handleFocusToggle(e: React.MouseEvent) {
    e.stopPropagation()
    toggleProjectFocus(project.id)
    onUpdate()
  }

  if (compact) {
    return (
      <div
        onClick={onOpen}
        className={`${bgClass} border border-[var(--border)] rounded-[var(--radius-lg)] px-4 pt-5 pb-5 cursor-pointer transition-colors`}
        {...hoverProps}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-[1.25rem] font-medium truncate" style={{ fontFamily: 'var(--font-display)' }}>{project.title}</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{project.goal}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <button
              onClick={handleFocusToggle}
              title={project.focused ? 'Remove focus' : 'Mark as focused'}
              className={`transition-colors ${project.focused ? 'text-[var(--amber)]' : 'text-[var(--border-strong)] hover:text-[var(--amber)]'}`}
            >
              <Flame size={14} />
            </button>

          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${bgClass} border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden transition-colors`} {...hoverProps}>
      {/* Project header */}
      <div className="px-4 pt-5 pb-5 cursor-pointer" onClick={onOpen}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-[1.25rem] font-medium truncate" style={{ fontFamily: 'var(--font-display)' }}>{project.title}</h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{project.goal}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <button
              onClick={handleFocusToggle}
              title={project.focused ? 'Remove focus' : 'Mark as focused'}
              className={`transition-colors ${project.focused ? 'text-[var(--amber)]' : 'text-[var(--border-strong)] hover:text-[var(--amber)]'}`}
            >
              <Flame size={16} />
            </button>

          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)] mt-2.5">{done.length} of {total} tasks done</p>
      </div>

      <Divider />

      {/* Active task */}
      <div className="px-4 py-4">
        {active ? (
          <ActiveTaskRow task={active} onUpdate={onUpdate} />
        ) : queued.length > 0 ? (
          <p className="text-sm text-[var(--text-muted)] italic">No active task — open project to set one</p>
        ) : done.length > 0 ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[var(--accent)]" />
            <p className="text-sm text-[var(--accent-text)] font-medium">All tasks complete</p>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)] italic">No tasks yet — open project to add some</p>
        )}
      </div>

    </div>
  )
}

function ActiveTaskRow({ task, onUpdate }: { task: Task; onUpdate: () => void }) {
  const [completing, setCompleting] = useState(false)

  if (completing) {
    return (
      <div className="animate-slide-in flex flex-col gap-3">
        <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">Completing task</p>
        <p className="text-sm font-medium text-[var(--text-primary)]">{task.title}</p>
        <CompleteForm
          onConfirm={r => { completeTask(task.id, r); setCompleting(false); onUpdate() }}
          onCancel={() => setCompleting(false)}
        />
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <button
        onClick={() => setCompleting(true)}
        className="mt-0.5 text-[var(--border-strong)] hover:text-[var(--accent)] transition-colors flex-shrink-0"
        title="Mark done"
      >
        <Circle size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] leading-snug">{task.title}</p>
        {task.notes && <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-2">{task.notes}</p>}
      </div>
      <Badge color="green">Active</Badge>
    </div>
  )
}
