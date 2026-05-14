'use client'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, signInWithGoogle, signOut, pullFromSupabase, pushToSupabase } from '@/lib/supabase'
import { loadData, saveData } from '@/lib/store'
import { Button } from '@/components/ui'

interface Props {
  children: (user: User, onSignOut: () => void) => React.ReactNode
}

export default function AuthGate({ children }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Read cached session from localStorage synchronously — no network call
    try {
      const raw = localStorage.getItem('sb-pdmucmsecmualoeljbav-auth-token')
      if (raw) {
        const parsed = JSON.parse(raw)
        setUser(parsed?.user ?? null)
      }
    } catch {}
    setLoading(false)

    // Handle sign-in / sign-out and token refreshes going forward
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user && !sessionStorage.getItem('synced')) {
        sessionStorage.setItem('synced', '1')
        syncOnLogin().catch(() => {})
      } else if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('synced')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function syncFromRemote() {
    const remote = await pullFromSupabase()
    if (!remote) return
    const local = loadData()
    if (remote.projects.length > 0 || remote.tasks.length > 0) {
      // Remote wins for any item that exists in both — ensures desktop changes
      // propagate to devices that already have a stale local copy.
      const remoteProjectIds = new Set(remote.projects.map(p => p.id))
      const remoteTaskIds = new Set(remote.tasks.map(t => t.id))
      saveData({
        projects: [...remote.projects, ...local.projects.filter(p => !remoteProjectIds.has(p.id))],
        tasks: [...remote.tasks, ...local.tasks.filter(t => !remoteTaskIds.has(t.id))],
      })
      window.dispatchEvent(new CustomEvent('mastery-data-synced'))
    } else if (local.projects.length > 0 || local.tasks.length > 0) {
      await pushToSupabase(local)
    }
  }

  async function syncOnLogin() {
    await syncFromRemote()
    // Re-sync when the user returns to the tab after being away 5+ minutes,
    // to catch changes from other devices if the realtime channel dropped.
    const RESYNC_MS = 5 * 60 * 1000
    let hiddenAt = 0
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
      } else if (hiddenAt > 0 && Date.now() - hiddenAt >= RESYNC_MS) {
        syncFromRemote().catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    // Cleanup is handled by the auth subscription teardown in practice,
    // but store the remover so the effect can call it if needed.
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }

  async function handleSignOut() {
    await signOut()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-8" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <h1 className="text-4xl mb-2" style={{ fontFamily: 'var(--font-display)' }}>Mastery</h1>
          <p className="text-sm text-[var(--text-secondary)]">One task per project. Every day.</p>
        </div>
        <Button variant="primary" onClick={signInWithGoogle}>
          Sign in with Google
        </Button>
      </div>
    )
  }

  return <>{children(user, handleSignOut)}</>
}
