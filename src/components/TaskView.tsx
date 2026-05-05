'use client'
import { useState, useLayoutEffect } from 'react'
import { ArrowLeft, Plus, X, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { Task, updateTask, deleteTask } from '@/lib/store'
import { Button, Input, Textarea, Badge, Card } from './ui'

interface Props {
  task: Task
  onBack: () => void
  onUpdate: () => void
  backLabel?: string
  onDelete?: () => void
}

export default function TaskView({ task: initialTask, onBack, onUpdate, backLabel = 'Back to project', onDelete }: Props) {
  const [task, setTask] = useState(initialTask)
  useLayoutEffect(() => { window.scrollTo(0, 0) }, [])
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(task.title)
  const [editingNotes, setEditingNotes] = useState(false)
  const [notesDraft, setNotesDraft] = useState(task.notes)
  const [newLink, setNewLink] = useState('')
  const [showAddLink, setShowAddLink] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  function save(updates: Partial<Pick<Task, 'title' | 'notes' | 'links'>>) {
    updateTask(task.id, updates)
    setTask(t => ({ ...t, ...updates }))
    onUpdate()
  }

  function addLink() {
    const trimmed = newLink.trim()
    if (!trimmed) return
    const links = [...(task.links ?? []), trimmed]
    save({ links })
    setNewLink('')
    setShowAddLink(false)
  }

  function removeLink(index: number) {
    const links = (task.links ?? []).filter((_, i) => i !== index)
    save({ links })
  }

  const statusColor: 'green' | 'amber' | 'gray' =
    task.type === 'idea' ? 'amber' : task.status === 'active' ? 'green' : 'gray'
  const statusLabel =
    task.type === 'idea' ? 'Idea' :
    task.status === 'active' ? 'Active' :
    task.status === 'done' ? 'Done' : 'Queued'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-10">

        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft size={14} /> {backLabel}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-2 animate-slide-in">
              <span className="text-xs text-[var(--text-secondary)]">Delete this task?</span>
              <Button variant="danger" size="sm" onClick={() => { deleteTask(task.id); onDelete ? onDelete() : onBack() }}>Yes, delete</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
              title="Delete task"
            >
              <Trash2 size={13} /> Delete
            </button>
          )}
        </div>

        {/* Task header */}
        <div className="mb-8 animate-fade-up">
          {editingTitle ? (
            <div className="flex flex-col gap-2 mb-2">
              <Input value={titleDraft} onChange={e => setTitleDraft(e.target.value)} autoFocus />
              <div className="flex gap-2">
                <Button size="sm" variant="primary" onClick={() => {
                  save({ title: titleDraft.trim() || task.title })
                  setEditingTitle(false)
                }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setTitleDraft(task.title); setEditingTitle(false) }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 mb-2">
              <h1
                className="flex-1 text-3xl cursor-pointer hover:text-[var(--text-secondary)] transition-colors"
                style={{ fontFamily: 'var(--font-display)' }}
                onClick={() => { setTitleDraft(task.title); setEditingTitle(true) }}
                title="Click to edit title"
              >
                {task.title}
              </h1>
              <Badge color={statusColor}>{statusLabel}</Badge>
            </div>
          )}
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Created {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {task.completedAt && ` · Completed ${new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
          </p>
        </div>

        {/* Notes */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-widest">Notes</p>
            {!editingNotes && (
              <Button size="sm" variant="ghost" onClick={() => { setNotesDraft(task.notes); setEditingNotes(true) }}>
                <Pencil size={12} /> Edit
              </Button>
            )}
          </div>
          {editingNotes ? (
            <Card className="p-4">
              <Textarea
                value={notesDraft}
                onChange={e => setNotesDraft(e.target.value)}
                rows={5}
                autoFocus
                placeholder="Add notes, context, or description..."
              />
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="primary" onClick={() => { save({ notes: notesDraft }); setEditingNotes(false) }}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditingNotes(false)}>Cancel</Button>
              </div>
            </Card>
          ) : (
            <div
              className="p-4 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] cursor-pointer hover:border-[var(--border-strong)] transition-colors"
              onClick={() => { setNotesDraft(task.notes); setEditingNotes(true) }}
            >
              {task.notes ? (
                <p className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">{task.notes}</p>
              ) : (
                <p className="text-sm text-[var(--text-muted)] italic">No notes yet — click to add...</p>
              )}
            </div>
          )}
        </section>

        {/* Reflection (completed tasks) */}
        {task.reflection && (
          <section className="mb-6">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-widest mb-3">Reflection</p>
            <Card className="p-4">
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed italic">"{task.reflection}"</p>
            </Card>
          </section>
        )}

        {/* Links */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-widest">Links</p>
            <Button size="sm" variant="ghost" onClick={() => setShowAddLink(v => !v)}>
              <Plus size={13} /> Add link
            </Button>
          </div>

          {showAddLink && (
            <Card className="p-4 mb-3 animate-slide-in">
              <div className="flex gap-2 items-center">
                <div className="flex-1">
                  <Input
                    placeholder="https://..."
                    value={newLink}
                    onChange={e => setNewLink(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addLink() }}
                    autoFocus
                  />
                </div>
                <Button size="sm" variant="primary" onClick={addLink}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowAddLink(false); setNewLink('') }}>Cancel</Button>
              </div>
            </Card>
          )}

          {(task.links ?? []).length === 0 && !showAddLink ? (
            <div className="border border-dashed border-[var(--border)] rounded-[var(--radius)] p-4 text-center">
              <p className="text-sm text-[var(--text-muted)]">No links yet. Add references, articles, or resources.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {(task.links ?? []).map((link, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] group">
                  <ExternalLink size={13} className="text-[var(--text-muted)] flex-shrink-0" />
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-sm text-[var(--accent-text)] hover:underline truncate"
                  >
                    {link}
                  </a>
                  <button
                    onClick={() => removeLink(i)}
                    className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  )
}
