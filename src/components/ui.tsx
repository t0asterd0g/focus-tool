'use client'
import { forwardRef, useState, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { CheckCircle2 } from 'lucide-react'

// Button
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'sm' | 'md'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className = '', children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-sans font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer'
    const sizes = { sm: 'px-3 py-1.5 text-xs rounded-md', md: 'px-4 py-2 text-sm rounded-[8px]' }
    const variants: Record<BtnVariant, string> = {
      primary: 'bg-[var(--bg-active)] text-[var(--text-inverse)] hover:bg-[#333] active:scale-[0.98]',
      secondary: 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)] active:scale-[0.98]',
      ghost: 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] active:scale-[0.98]',
      danger: 'text-[var(--danger)] border border-[var(--danger)] hover:bg-[var(--danger-light)] active:scale-[0.98]',
    }
    return (
      <button ref={ref} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// Input
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}
export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">{label}</label>}
      <input
        className={`w-full px-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors font-sans ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  )
}

// Textarea
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}
export function Textarea({ label, hint, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide">{label}</label>}
      {hint && <p className="text-xs text-[var(--text-muted)]">{hint}</p>}
      <textarea
        className={`w-full px-3 py-2.5 text-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-colors font-sans resize-none ${className}`}
        {...props}
      />
    </div>
  )
}

// Badge
type BadgeColor = 'green' | 'amber' | 'gray' | 'red'
export function Badge({ children, color = 'gray' }: { children: React.ReactNode; color?: BadgeColor }) {
  const colors: Record<BadgeColor, string> = {
    green: 'bg-[var(--accent-light)] text-[var(--accent-text)]',
    amber: 'bg-[var(--amber-light)] text-[var(--amber)]',
    gray: 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]',
    red: 'bg-[var(--danger-light)] text-[var(--danger)]',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
      {children}
    </span>
  )
}

// Divider
export function Divider() {
  return <div className="border-t border-[var(--border)]" />
}

// Card
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] ${className}`}>
      {children}
    </div>
  )
}

// Complete task form (reflection textarea + confirm/cancel)
export function CompleteForm({ onConfirm, onCancel, label = 'Mark done', rows = 2 }: {
  onConfirm: (reflection?: string) => void
  onCancel: () => void
  label?: string
  rows?: number
}) {
  const [reflection, setReflection] = useState('')
  return (
    <div className="flex flex-col gap-3">
      <Textarea
        placeholder="Any reflection on this task? (optional)"
        value={reflection}
        onChange={e => setReflection(e.target.value)}
        rows={rows}
      />
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => onConfirm(reflection.trim() || undefined)}>
          <CheckCircle2 size={13} /> {label}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}

// Empty state
export function Empty({ icon, title, description }: { icon: string; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="text-3xl">{icon}</span>
      <p className="font-medium text-[var(--text-primary)]">{title}</p>
      {description && <p className="text-sm text-[var(--text-muted)] max-w-xs">{description}</p>}
    </div>
  )
}
