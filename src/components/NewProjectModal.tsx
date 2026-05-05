'use client'
import { useState } from 'react'
import { X } from 'lucide-react'
import { Button, Input, Textarea } from './ui'
import { createProject } from '@/lib/store'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function NewProjectModal({ onClose, onCreated }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [title, setTitle] = useState('')
  const [goal, setGoal] = useState('')
  const [scope, setScope] = useState('')
  const [error, setError] = useState('')

  function next() {
    if (step === 1 && !title.trim()) { setError('Give your project a name.'); return }
    if (step === 2 && !goal.trim()) { setError('Describe your goal.'); return }
    setError('')
    if (step < 3) setStep(s => (s + 1) as 2 | 3)
    else finish()
  }

  function finish() {
    if (!scope.trim()) { setError('Define your scope.'); return }
    createProject(title.trim(), goal.trim(), scope.trim())
    onCreated()
    onClose()
  }

  const steps = [
    { num: 1, label: 'Name' },
    { num: 2, label: 'Goal' },
    { num: 3, label: 'Scope' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(26,26,26,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-[var(--bg-card)] rounded-[var(--radius-lg)] w-full max-w-lg shadow-2xl animate-fade-up">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl" style={{ fontFamily: 'var(--font-display)' }}>New project</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-6 pt-4 gap-2">
          {steps.map(s => (
            <div key={s.num} className="flex-1">
              <div className={`h-1 rounded-full transition-colors duration-300 ${step >= s.num ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-6 min-h-[220px]">
          {step === 1 && (
            <div className="animate-slide-in flex flex-col gap-4">
              <div>
                <p className="text-lg mb-1" style={{ fontFamily: 'var(--font-display)' }}>What is this project called?</p>
                <p className="text-sm text-[var(--text-secondary)]">Give it a short, memorable name.</p>
              </div>
              <Input
                placeholder="e.g. Learn Figma Interactions"
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && next()}
                autoFocus
              />
            </div>
          )}
          {step === 2 && (
            <div className="animate-slide-in flex flex-col gap-4">
              <div>
                <p className="text-lg mb-1" style={{ fontFamily: 'var(--font-display)' }}>What is your goal?</p>
                <p className="text-sm text-[var(--text-secondary)]">What does success look like? Be specific.</p>
              </div>
              <Textarea
                placeholder="e.g. Be able to build interactive prototypes with variables and advanced transitions without tutorials"
                value={goal}
                onChange={e => setGoal(e.target.value)}
                rows={4}
                autoFocus
              />
            </div>
          )}
          {step === 3 && (
            <div className="animate-slide-in flex flex-col gap-4">
              <div>
                <p className="text-lg mb-1" style={{ fontFamily: 'var(--font-display)' }}>What is in scope?</p>
                <p className="text-sm text-[var(--text-secondary)]">Define the boundaries. What are you NOT trying to learn? This keeps you focused.</p>
              </div>
              <Textarea
                placeholder="e.g. Only Figma prototyping features. Not design systems, not handoff, not Figma plugins."
                value={scope}
                onChange={e => setScope(e.target.value)}
                rows={4}
                autoFocus
              />
            </div>
          )}
          {error && <p className="text-xs text-[var(--danger)] mt-3">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={step > 1 ? () => { setStep(s => (s - 1) as 1 | 2); setError('') } : onClose}>
            {step > 1 ? '← Back' : 'Cancel'}
          </Button>
          <Button variant="primary" onClick={next}>
            {step < 3 ? 'Continue →' : 'Create project'}
          </Button>
        </div>
      </div>
    </div>
  )
}
