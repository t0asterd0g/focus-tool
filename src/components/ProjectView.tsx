'use client'
import { useState } from 'react'
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

  const active = getActiveTask(project.id)
  const queued = getQueuedTasks(project.id)
  const done = getCompletedTasks(project.id)
  const ideas = getIdeas(project.id)
  const total = (active ? 1 : 0) + queued.length + done.length
  const pct = total > 0 ? Math.round((done.length / total) * 100) : 0

  function bump() { setRefresh(r => r + 1); onUpdate() }

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
            <div className="flex flex-col gap-2">
              {queued.map((task, i) => (
                <QueuedTaskRow
                  key={task.id}
                  task={task}
                  position={i + 1}
                  hasActiveFocus={!!active}
                  isDragging={dragId === task.id}
                  isDragOver={dragOverId === task.id}
                  onDelete={() => { deleteTask(task.id); bump() }}
                  onOpen={() => { setEditingTitle(false); setTaskView(task) }}
                  onComplete={(reflection) => { handleComplete(task.id, reflection) }}
                  onMakeFocus={() => handleMakeFocus(task.id)}
                  onDragStart={() => setDragId(task.id)}
                  onDragOver={() => setDragOverId(task.id)}
                  onDrop={() => handleDrop(task.id)}
                  onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                />
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
                  <DoneTaskRow key={task.id} task={task} onOpen={() => { setEditingTitle(false); setTaskView(task) }} onRequeue={() => { requeueTask(task.id); bump() }} />
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

function QueuedTaskRow({ task, position, onDelete, onOpen, onComplete, onMakeFocus, hasActiveFocus, isDragging, isDragOver, onDragStart, onDragOver, onDrop, onDragEnd }: {
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
}) {
  const [completing, setCompleting] = useState(false)

  return (
    <div
      draggable={!completing}
      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() }}
      onDragOver={e => { e.preventDefault(); onDragOver() }}
      onDrop={e => { e.preventDefault(); onDrop() }}
      onDragEnd={onDragEnd}
      className="bg-[var(--bg-card)] border rounded-[var(--radius-sm)] transition-colors overflow-hidden"
      style={{
        borderColor: isDragOver ? 'var(--accent)' : 'var(--border)',
        opacity: isDragging ? 0.4 : 1,
        borderTopWidth: isDragOver ? 2 : undefined,
      }}
    >
      <div
        onClick={!completing ? onOpen : undefined}
        className="flex items-center gap-3 px-4 py-3 group cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors"
      >
        <span
          className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <GripVertical size={13} />
        </span>
        <span className="text-xs text-[var(--text-muted)] w-4 text-right flex-shrink-0">{position}</span>
        <button
          onClick={e => { e.stopPropagation(); setCompleting(v => !v) }}
          className="text-[var(--border-strong)] hover:text-[var(--accent)] transition-colors flex-shrink-0"
          title="Mark done"
        >
          {completing ? <CheckCircle2 size={14} className="text-[var(--accent)]" /> : <Circle size={14} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-[var(--text-primary)] truncate">{task.title}</p>
            {task.links && task.links.length > 0 && (
              <Link2 size={11} className="text-[var(--text-muted)] flex-shrink-0" />
            )}
          </div>
          {task.notes && <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{task.notes}</p>}
        </div>
        <div className="flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-all">
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

      {completing && (
        <div className="px-4 pb-4 animate-slide-in border-t border-[var(--border)] pt-3">
          <CompleteForm
            onConfirm={r => { onComplete(r); setCompleting(false) }}
            onCancel={() => setCompleting(false)}
            initialValue={task.reflection}
          />
        </div>
      )}
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
  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[var(--radius-sm)] cursor-pointer hover:bg-[#D67402]/20 transition-colors"
    >
      <button
        onClick={e => { e.stopPropagation(); onRequeue() }}
        className="flex-shrink-0 text-[var(--accent)] hover:text-[var(--text-muted)] transition-colors"
        title="Move back to queue"
      >
        <CheckCircle2 size={14} />
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
