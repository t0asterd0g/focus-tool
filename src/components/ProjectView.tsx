'use client'
import { useState, useCallback, useEffect, useRef } from 'react'
import {
  ArrowLeft, Plus, CheckCircle2, Circle, Lightbulb, ArrowUp,
  Trash2, ArrowDown, X, GripVertical, Zap, Link2, FileText
} from 'lucide-react'
import {
  Project, Task,
  getActiveTask, getQueuedTasks, getCompletedTasks, getIdeas,
  completeTask, requeueTask, addTask, promoteIdea, deleteTask, updateProject, deleteProject,
  reorderTasks, swapActiveTask
} from '@/lib/store'
import { Button, Badge, Textarea, Input, Divider, Card, Empty, CompleteForm } from './ui'
import TaskView from './TaskView'

interface Props {
  project: Project
  onBack: () => void
  onUpdate: () => void
  initialTaskId?: string
  onInitialTaskBack?: () => void
}

type AddMode = null | 'task' | 'idea'

export default function ProjectView({ project, onBack, onUpdate, initialTaskId, onInitialTaskBack }: Props) {
  const [refresh, setRefresh] = useState(0)
  const [addMode, setAddMode] = useState<AddMode>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState(project.goal)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(project.title)
  const [taskView, setTaskView] = useState<Task | null>(() => {
    if (!initialTaskId) return null
    const data = [getActiveTask(project.id), ...getQueuedTasks(project.id), ...getCompletedTasks(project.id), ...getIdeas(project.id)]
    return data.find(t => t?.id === initialTaskId) ?? null
  })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [requeuedIds, setRequeuedIds] = useState<Set<string>>(new Set())
  const [touchDragId, setTouchDragId] = useState<string | null>(null)
  // insertAfter: null = insert at top, string = insert after that task id
  const [touchInsertAfter, setTouchInsertAfter] = useState<string | 'top' | null>(null)
  const [touchGhost, setTouchGhost] = useState<{ y: number; title: string } | null>(null)
  const touchDragIdRef = useRef<string | null>(null)
  const touchInsertAfterRef = useRef<string | 'top' | null>(null)
  const queueListRef = useRef<HTMLDivElement>(null)

  const baseActive = getActiveTask(project.id)
  const baseQueued = getQueuedTasks(project.id)
  const baseDone = getCompletedTasks(project.id)
  const ideas = getIdeas(project.id)

  // Optimistic requeue: remove from done, inject into queued/active
  const requeuedTasks = baseDone
    .filter(t => requeuedIds.has(t.id))
    .map(t => ({ ...t, status: (baseActive ? 'queued' : 'active') as Task['status'], completedAt: undefined }))
  const active = baseActive ?? (requeuedTasks.find(t => t.status === 'active') || null)
  const queued = [...baseQueued, ...requeuedTasks.filter(t => t.status === 'queued')]
  const done = baseDone.filter(t => !requeuedIds.has(t.id))

  const total = (active ? 1 : 0) + queued.length + done.length
  const pct = total > 0 ? Math.round((done.length / total) * 100) : 0

  function bump() { setRequeuedIds(new Set()); setRefresh(r => r + 1); onUpdate() }

  function handleAdd() {
    if (!newTitle.trim() || !addMode) return
    addTask(project.id, newTitle.trim(), newNotes.trim(), addMode)
    setNewTitle(''); setNewNotes(''); setAddMode(null)
    bump()
  }

  function handleComplete(taskId: string, reflection?: string) {
    completeTask(taskId, reflection)
    bump()
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return }
    const ids = queued.map(t => t.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    if (from === -1 || to === -1) return
    const reordered = [...ids]
    reordered.splice(from, 1)
    reordered.splice(to, 0, dragId)
    reorderTasks(project.id, reordered)
    setDragId(null); setDragOverId(null)
    bump()
  }

  function handleMakeFocus(taskId: string) {
    swapActiveTask(taskId)
    bump()
  }

  function handleTouchDragStart(taskId: string, clientY: number, title: string) {
    touchDragIdRef.current = taskId
    touchInsertAfterRef.current = null
    setTouchDragId(taskId)
    setTouchInsertAfter(null)
    setTouchGhost({ y: clientY, title })
    // Prevent text selection during drag
    document.body.style.userSelect = 'none'
    document.body.style.webkitUserSelect = 'none'
    // Haptic feedback if available
    if (navigator.vibrate) navigator.vibrate(30)
  }

  useEffect(() => {
    if (!touchDragId) return

    function getInsertAfterFromY(touchY: number): string | 'top' | null {
      const list = queueListRef.current
      if (!list) return null
      const rows = Array.from(list.querySelectorAll<HTMLElement>('[data-task-id]'))
      if (rows.length === 0) return null
      // Find the row whose midpoint the finger is above
      for (let i = 0; i < rows.length; i++) {
        const rect = rows[i].getBoundingClientRect()
        const mid = rect.top + rect.height / 2
        if (touchY < mid) {
          return i === 0 ? 'top' : (rows[i - 1].dataset.taskId ?? null)
        }
      }
      // Below all rows → insert after last
      return rows[rows.length - 1].dataset.taskId ?? null
    }

    function onTouchMove(e: TouchEvent) {
      e.preventDefault() // prevent scroll + text selection
      const touch = e.touches[0]
      setTouchGhost(g => g ? { ...g, y: touch.clientY } : null)
      const insertAfter = getInsertAfterFromY(touch.clientY)
      if (insertAfter !== touchInsertAfterRef.current) {
        touchInsertAfterRef.current = insertAfter
        setTouchInsertAfter(insertAfter)
      }
    }

    function onTouchEnd() {
      const fromId = touchDragIdRef.current
      const insertAfter = touchInsertAfterRef.current
      if (fromId && insertAfter !== null) {
        const ids = getQueuedTasks(project.id).map(t => t.id)
        const from = ids.indexOf(fromId)
        if (from !== -1) {
          const reordered = ids.filter(id => id !== fromId)
          if (insertAfter === 'top') {
            reordered.unshift(fromId)
          } else {
            const afterIdx = reordered.indexOf(insertAfter)
            if (afterIdx !== -1) {
              reordered.splice(afterIdx + 1, 0, fromId)
            } else {
              reordered.push(fromId)
            }
          }
          if (reordered.join() !== ids.join()) {
            reorderTasks(project.id, reordered)
            bump()
          }
        }
      }
      touchDragIdRef.current = null
      touchInsertAfterRef.current = null
      setTouchDragId(null)
      setTouchInsertAfter(null)
      setTouchGhost(null)
      document.body.style.userSelect = ''
      document.body.style.webkitUserSelect = ''
    }

    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [touchDragId, project.id])

  // Task detail view
  if (taskView) {
    return (
      <TaskView
        task={taskView}
        onBack={onInitialTaskBack && taskView.id === initialTaskId ? onInitialTaskBack : () => { setTaskView(null); bump() }}
        onUpdate={bump}
        backLabel={onInitialTaskBack && taskView.id === initialTaskId ? 'Back' : 'Back to project'}
        onDelete={onInitialTaskBack && taskView.id === initialTaskId ? onInitialTaskBack : () => { setTaskView(null); bump() }}
      />
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* Back */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft size={14} /> Back
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-2 animate-slide-in">
              <span className="text-xs text-[var(--text-secondary)]">Delete this project?</span>
              <Button variant="danger" size="sm" onClick={() => { deleteProject(project.id); onBack() }}>Yes, delete</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
              title="Delete project"
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>

        {/* Project header */}
        <div className="mb-8 animate-fade-up">
          {editingTitle ? (
            <div className="flex flex-col gap-2 mb-2">
              <Input value={titleDraft} onChange={e => setTitleDraft(e.target.value)} autoFocus />
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={() => {
                  if (titleDraft.trim()) { updateProject(project.id, { title: titleDraft.trim() }); bump() }
                  setEditingTitle(false)
                }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setTitleDraft(project.title); setEditingTitle(false) }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <h1
              className="text-3xl mb-2 cursor-pointer hover:text-[var(--text-secondary)] transition-colors"
              style={{ fontFamily: 'var(--font-display)' }}
              onClick={() => { setTitleDraft(project.title); setEditingTitle(true) }}
              title="Click to edit title"
            >{project.title}</h1>
          )}

          {editingGoal ? (
            <Card className="p-4 mt-3">
              <Textarea value={goalDraft} onChange={e => setGoalDraft(e.target.value)} rows={3} autoFocus />
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="primary" onClick={() => {
                  updateProject(project.id, { goal: goalDraft })
                  setEditingGoal(false); bump()
                }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingGoal(false)}>Cancel</Button>
              </div>
            </Card>
          ) : (
            <p
              className="text-[var(--text-secondary)] text-sm leading-relaxed cursor-pointer hover:text-[var(--text-primary)] transition-colors"
              onClick={() => { setGoalDraft(project.goal); setEditingGoal(true) }}
              title="Click to edit goal"
            >
              {project.goal}
            </p>
          )}

          <div className="mt-3 inline-flex items-start gap-2 px-3 py-3 text-xs bg-[var(--bg-subtle)] text-[var(--text-secondary)]" style={{ borderRadius: 'var(--radius)' }}>
            <span className="font-medium">Scope:</span> {project.scope}
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1.5">
              <span>{done.length} of {total} tasks complete</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden border border-[var(--border)]">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
            </div>
          </div>
        </div>

        {/* Active task */}
        <section className="mb-6 animate-fade-up-delay">
          <div className="mb-3"><SectionLabel>Current focus</SectionLabel></div>
          {active ? (
            <ActiveTaskCard task={active} onComplete={handleComplete} onOpen={() => { setEditingTitle(false); setTaskView(active) }} />
          ) : (
            <Card className="p-5">
              <Empty icon="○" title="No active task" description="Add a task below to get started on this project." />
            </Card>
          )}
        </section>

        {/* Task queue */}
        <section className="mb-6 animate-fade-up-delay-2">
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Queue ({queued.length})</SectionLabel>
            <Button size="sm" variant="ghost" onClick={() => setAddMode(addMode === 'task' ? null : 'task')}>
              <Plus size={13} /> Add task
            </Button>
          </div>

          {addMode === 'task' && (
            <AddForm
              placeholder="What is the next step?"
              notesPlaceholder="Why does this task matter? Any context..."
              title={newTitle} notes={newNotes}
              onTitleChange={setNewTitle} onNotesChange={setNewNotes}
              onAdd={handleAdd} onCancel={() => { setAddMode(null); setNewTitle(''); setNewNotes('') }}
              label="Add task"
            />
          )}

          {queued.length === 0 && addMode !== 'task' ? (
            <div className="border border-dashed border-[var(--border)] rounded-[var(--radius)] p-5 text-center">
              <p className="text-sm text-[var(--text-muted)]">No tasks queued. Add some steps to build towards your goal.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 relative" ref={queueListRef}>
              {/* Asana-style floating ghost: hovers above finger so it's always visible */}
              {touchGhost && (
                <div
                  className="fixed left-4 right-4 z-50 pointer-events-none"
                  style={{ top: touchGhost.y - 80, transform: 'scale(1.04) rotate(-0.5deg)', opacity: 0.95 }}
                >
                  <div className="bg-[var(--bg-card)] border-2 border-[var(--accent)] rounded-[var(--radius-sm)] px-4 py-3 shadow-2xl">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{touchGhost.title}</p>
                  </div>
                </div>
              )}
              {/* Top insertion line */}
              {touchDragId && touchInsertAfter === 'top' && (
                <div className="h-0.5 rounded-full bg-[var(--accent)] mx-1 -mb-1" />
              )}
              {queued.map((task, i) => (
                <div key={task.id}>
                  <QueuedTaskRow
                    task={task}
                    position={i + 1}
                    hasActiveFocus={!!active}
                    isDragging={dragId === task.id || touchDragId === task.id}
                    isDragOver={dragOverId === task.id}
                    onDelete={() => { deleteTask(task.id); bump() }}
                    onOpen={() => { setEditingTitle(false); setTaskView(task) }}
                    onComplete={(reflection) => { handleComplete(task.id, reflection) }}
                    onMakeFocus={() => handleMakeFocus(task.id)}
                    onDragStart={() => setDragId(task.id)}
                    onDragOver={() => setDragOverId(task.id)}
                    onDrop={() => handleDrop(task.id)}
                    onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                    onTouchDragStart={(clientY) => handleTouchDragStart(task.id, clientY, task.title)}
                  />
                  {/* Insertion line after this row */}
                  {touchDragId && touchInsertAfter === task.id && touchDragId !== task.id && (
                    <div className="h-0.5 rounded-full bg-[var(--accent)] mx-1 mt-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <Divider />

        {/* Ideas / backlog */}
        <section className="my-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-[var(--amber)]" />
              <SectionLabel>Ideas & backlog ({ideas.length})</SectionLabel>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setAddMode(addMode === 'idea' ? null : 'idea')}>
              <Plus size={13} /> Capture idea
            </Button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-3">Ideas live here without affecting your current task queue. Promote them to tasks when ready.</p>

          {addMode === 'idea' && (
            <AddForm
              placeholder="What's the idea?"
              notesPlaceholder="Any context on this idea..."
              title={newTitle} notes={newNotes}
              onTitleChange={setNewTitle} onNotesChange={setNewNotes}
              onAdd={handleAdd} onCancel={() => { setAddMode(null); setNewTitle(''); setNewNotes('') }}
              label="Save idea"
            />
          )}

          {ideas.length === 0 && addMode !== 'idea' ? (
            <div className="border border-dashed border-[var(--amber-light)] rounded-[var(--radius)] p-4 text-center">
              <p className="text-sm text-[var(--text-muted)]">No ideas yet. Capture thoughts here without scope creep.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {ideas.map(idea => (
                <IdeaRow
                  key={idea.id}
                  idea={idea}
                  onPromote={() => { promoteIdea(idea.id); bump() }}
                  onDelete={() => { deleteTask(idea.id); bump() }}
                  onOpen={() => { setEditingTitle(false); setTaskView(idea) }}
                />
              ))}
            </div>
          )}
        </section>

        <Divider />

        {/* Completed tasks */}
        {done.length > 0 && (
          <section className="mt-6">
            <button
              onClick={() => setShowDone(v => !v)}
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-3"
            >
              {showDone ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
              Completed ({done.length})
            </button>
            {showDone && (
              <div className="flex flex-col gap-2">
                {done.map(task => (
                  <DoneTaskRow key={task.id} task={task} onOpen={() => { setEditingTitle(false); setTaskView(task) }} onRequeue={() => { requeueTask(task.id); setRequeuedIds(prev => { const n = new Set(prev); n.add(task.id); return n }) }} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}

// Sub-components

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-widest">{children}</p>
}

function ActiveTaskCard({ task, onComplete, onOpen }: {
  task: Task
  onComplete: (id: string, reflection?: string) => void
  onOpen: () => void
}) {
  const [completing, setCompleting] = useState(false)

  return (
    <Card className="px-5 pt-5 pb-4">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-2 h-2 rounded-full mt-[0.4rem] flex-shrink-0" style={{ background: 'var(--accent)' }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="font-medium text-[var(--text-primary)] leading-snug text-base hover:text-[var(--text-secondary)] transition-colors cursor-pointer flex-1" onClick={onOpen}>{task.title}</p>
            {task.links && task.links.length > 0 && (
              <Link2 size={13} className="text-[var(--text-muted)] flex-shrink-0 self-center" />
            )}
            <Badge color="green">Active</Badge>
          </div>
          {task.notes && (
            <p className="text-sm text-[var(--text-secondary)] leading-snug line-clamp-2 mt-0.5 cursor-pointer" onClick={onOpen}>{task.notes}</p>
          )}
        </div>
      </div>

      {!completing ? (
        <div className="flex gap-2 mt-4">
          <Button variant="primary" size="sm" onClick={() => setCompleting(true)}>
            <CheckCircle2 size={13} /> Mark done
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpen}>Details</Button>
        </div>
      ) : (
        <div className="mt-4 animate-slide-in border-t border-[var(--border)] pt-4">
          <CompleteForm
            onConfirm={r => { setCompleting(false); onComplete(task.id, r) }}
            onCancel={() => setCompleting(false)}
            label="Done — load next task"
            rows={3}
            initialValue={task.reflection}
          />
        </div>
      )}
    </Card>
  )
}

function QueuedTaskRow({ task, position, onDelete, onOpen, onComplete, onMakeFocus, hasActiveFocus, isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd, onTouchDragStart }: {
  task: Task
  position: number
  hasActiveFocus: boolean
  isDragging: boolean
  isDragOver: boolean
  onDelete: () => void
  onOpen: () => void
  onComplete: (reflection?: string) => void
  onMakeFocus: () => void
  onDragStart: () => void
  onDragOver: () => void
  onDrop: () => void
  onDragEnd: () => void
  onTouchDragStart: (clientY: number) => void
}) {
  const [checked, setChecked] = useState(false)
  const [rippling, setRippling] = useState(false)
  const [gone, setGone] = useState(false)
  const [hovered, setHovered] = useState(false)
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleCheck = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (checked) return
    setChecked(true)
    setRippling(true)
    setTimeout(() => {
      setGone(true)
      setTimeout(() => { onComplete() }, 420)
    }, 1200)
  }, [checked, onComplete])

  if (gone) return null

  return (
    <div
      data-task-id={task.id}
      draggable={!checked}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragOver={e => { e.preventDefault(); onDragOver() }}
      onDrop={e => { e.preventDefault(); onDrop() }}
      onDragEnd={onDragEnd}
      className={`bg-[var(--bg-card)] border rounded-[var(--radius-sm)] transition-colors overflow-hidden${checked ? ' task-card-bounce' : ''}${gone ? ' task-row-fadeout' : ''}`}
      style={{
        borderColor: isDragOver ? 'var(--accent)' : 'var(--border)',
        opacity: isDragging ? 0.4 : 1,
        borderTopWidth: isDragOver ? 2 : undefined,
      }}
    >
      <div
        onClick={!checked ? onOpen : undefined}
        className="flex items-center gap-3 px-4 py-3 group cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors select-none"
        style={{ WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
        onTouchStart={e => {
          if (checked) return
          // Block text selection immediately — before any timer fires
          document.body.style.userSelect = 'none'
          ;(document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = 'none'
          const clientY = e.touches[0].clientY
          const startX = e.touches[0].clientX
          holdTimerRef.current = setTimeout(() => {
            holdTimerRef.current = null
            onTouchDragStart(clientY)
          }, 300)
          // Cancel if finger moves significantly (user is scrolling)
          const onMove = (ev: TouchEvent) => {
            const dx = ev.touches[0].clientX - startX
            const dy = ev.touches[0].clientY - clientY
            if (Math.sqrt(dx * dx + dy * dy) > 8) {
              if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
              document.body.style.userSelect = ''
              ;(document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = ''
              document.removeEventListener('touchmove', onMove)
              document.removeEventListener('touchend', onEnd)
            }
          }
          const onEnd = () => {
            if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null }
            document.body.style.userSelect = ''
            ;(document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = ''
            document.removeEventListener('touchmove', onMove)
            document.removeEventListener('touchend', onEnd)
          }
          document.addEventListener('touchmove', onMove, { passive: true })
          document.addEventListener('touchend', onEnd, { once: true })
        }}
      >
        {/* Grip handle — visual hint only on mobile, functional on desktop */}
        <span
          className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-50 touch-none select-none transition-opacity flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical size={16} />
        </span>
        <span className="text-xs text-[var(--text-muted)] w-4 text-right flex-shrink-0">{position}</span>
        <button
          onClick={handleCheck}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="flex-shrink-0 focus:outline-none"
          title="Mark done"
        >
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', overflow: 'visible' }}>
            {rippling && (
              <circle cx="9" cy="9" r="7" fill="none" stroke="var(--accent)" strokeWidth="2" className="task-ripple" onAnimationEnd={() => setRippling(false)} />
            )}
            <circle
              cx="9" cy="9" r="7.5"
              stroke={checked ? '#087821' : hovered ? '#087821' : 'var(--border-strong)'}
              strokeWidth="1.5"
              fill={checked || hovered ? '#087821' : 'none'}
              fillOpacity={checked ? 1 : hovered ? 0.2 : 0}
              style={{ transition: 'stroke 160ms, fill 160ms, fill-opacity 160ms' }}
            />
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-sm truncate transition-colors${checked ? ' line-through text-[var(--text-muted)]' : ' text-[var(--text-primary)]'}`}>{task.title}</p>
            {task.links && task.links.length > 0 && (
              <Link2 size={11} className="text-[var(--text-muted)] flex-shrink-0" />
            )}
          </div>
          {task.notes && <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{task.notes}</p>}
        </div>
        <div className={`flex items-center gap-6 transition-all${checked ? ' opacity-0' : ' opacity-0 group-hover:opacity-100'}`}>
          {hasActiveFocus && (
            <button
              onClick={e => { e.stopPropagation(); onMakeFocus() }}
              className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
              title="Make this the current focus"
            >
              <Zap size={13} />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

function IdeaRow({ idea, onPromote, onDelete, onOpen }: {
  idea: Task
  onPromote: () => void
  onDelete: () => void
  onOpen: () => void
}) {
  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] group cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors"
    >
      <Lightbulb size={13} className="text-[var(--amber)] flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm text-[var(--text-primary)] truncate">{idea.title}</p>
          {idea.links && idea.links.length > 0 && (
            <Link2 size={11} className="text-[var(--text-muted)] flex-shrink-0" />
          )}
        </div>
        {idea.notes && <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{idea.notes}</p>}
      </div>
      <div className="flex gap-6 opacity-0 group-hover:opacity-100 transition-all">
        <button
          onClick={e => { e.stopPropagation(); onPromote() }}
          className="text-[var(--accent)] hover:text-[var(--accent-text)] transition-colors"
          title="Promote to task queue"
        >
          <ArrowUp size={13} />
        </button>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

function DoneTaskRow({ task, onOpen, onRequeue }: { task: Task; onOpen: () => void; onRequeue: () => void }) {
  const [unchecking, setUnchecking] = useState(false)

  function handleRequeue(e: React.MouseEvent) {
    e.stopPropagation()
    setUnchecking(true)
    setTimeout(() => { onRequeue() }, 320)
  }

  return (
    <div
      onClick={!unchecking ? onOpen : undefined}
      className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[var(--radius-sm)] cursor-pointer hover:bg-[#D67402]/20 transition-colors"
    >
      <button
        onClick={handleRequeue}
        disabled={unchecking}
        className="flex-shrink-0 text-[var(--accent)] hover:text-[var(--text-muted)] transition-colors"
        title="Move back to queue"
      >
        <span className={unchecking ? 'task-uncheck-icon inline-flex' : 'inline-flex'}>
          {unchecking ? <Circle size={14} className="text-[var(--text-muted)]" /> : <CheckCircle2 size={14} />}
        </span>
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-secondary)] line-through">{task.title}</p>
        {task.completedAt && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>
      {task.reflection && (
        <FileText size={13} className="text-[var(--text-muted)] flex-shrink-0" />
      )}
    </div>
  )
}

function AddForm({
  placeholder, notesPlaceholder, title, notes,
  onTitleChange, onNotesChange, onAdd, onCancel, label
}: {
  placeholder: string; notesPlaceholder: string
  title: string; notes: string
  onTitleChange: (v: string) => void
  onNotesChange: (v: string) => void
  onAdd: () => void; onCancel: () => void; label: string
}) {
  return (
    <Card className="p-4 mb-3 animate-slide-in">
      <div className="flex flex-col gap-3">
        <Input placeholder={placeholder} value={title} onChange={e => onTitleChange(e.target.value)} autoFocus />
        <Textarea placeholder={notesPlaceholder} value={notes} onChange={e => onNotesChange(e.target.value)} rows={2} />
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={onAdd}>{label}</Button>
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </Card>
  )
}
