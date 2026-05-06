import { createClient, RealtimeChannel } from '@supabase/supabase-js'
import type { AppData, Project, Task } from './store'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin },
  })
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getUser() {
  const { data } = await supabase.auth.getSession()
  return data.session?.user ?? null
}

// Pull all data for the current user from Supabase
export async function pullFromSupabase(): Promise<AppData | null> {
  const user = await getUser()
  if (!user) return null

  const [{ data: projects }, { data: tasks }] = await Promise.all([
    supabase.from('projects').select('*').eq('user_id', user.id),
    supabase.from('tasks').select('*').eq('user_id', user.id),
  ])

  return {
    projects: (projects ?? []).map(dbToProject),
    tasks: (tasks ?? []).map(dbToTask),
  }
}

// Push full local data to Supabase (used for migration and full sync)
export async function pushToSupabase(data: AppData): Promise<{ projectsError: unknown; tasksError: unknown }> {
  const user = await getUser()
  if (!user) return { projectsError: 'no user', tasksError: 'no user' }

  const dbProjects = data.projects.map(p => projectToDb(p, user.id))
  const dbTasks = data.tasks.map(t => taskToDb(t, user.id))

  const projectsRes = dbProjects.length > 0
    ? await supabase.from('projects').upsert(dbProjects, { onConflict: 'id' })
    : { error: null }

  const tasksRes = dbTasks.length > 0
    ? await supabase.from('tasks').upsert(dbTasks, { onConflict: 'id' })
    : { error: null }

  return { projectsError: projectsRes?.error, tasksError: tasksRes?.error }
}

// Sync a single project upsert
export async function syncProject(project: Project): Promise<void> {
  const user = await getUser()
  if (!user) return
  await supabase.from('projects').upsert(projectToDb(project, user.id), { onConflict: 'id' })
}

// Sync a single task upsert
export async function syncTask(task: Task): Promise<void> {
  const user = await getUser()
  if (!user) return
  await supabase.from('tasks').upsert(taskToDb(task, user.id), { onConflict: 'id' })
}

export async function syncDeleteProject(id: string): Promise<void> {
  const user = await getUser()
  if (!user) return
  await supabase.from('projects').delete().eq('id', id).eq('user_id', user.id)
  await supabase.from('tasks').delete().eq('project_id', id).eq('user_id', user.id)
}

export async function syncDeleteTask(id: string): Promise<void> {
  const user = await getUser()
  if (!user) return
  await supabase.from('tasks').delete().eq('id', id).eq('user_id', user.id)
}

export async function syncTasks(tasks: Task[]): Promise<void> {
  const user = await getUser()
  if (!user || tasks.length === 0) return
  await supabase.from('tasks').upsert(tasks.map(t => taskToDb(t, user.id)), { onConflict: 'id' })
}

// Subscribe to real-time changes from other devices and merge into localStorage
export function subscribeToChanges(userId: string, onUpdate: () => void): RealtimeChannel {
  const STORAGE_KEY = 'mastery-app-v1'

  function getLocal(): AppData {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : { projects: [], tasks: [] }
    } catch { return { projects: [], tasks: [] } }
  }

  const channel = supabase
    .channel(`db-changes-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${userId}` }, payload => {
      const data = getLocal()
      if (payload.eventType === 'DELETE') {
        data.projects = data.projects.filter(p => p.id !== payload.old.id)
        data.tasks = data.tasks.filter(t => t.projectId !== payload.old.id)
      } else {
        const project = dbToProject(payload.new as Record<string, unknown>)
        const idx = data.projects.findIndex(p => p.id === project.id)
        if (idx !== -1) data.projects[idx] = project
        else data.projects.push(project)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      onUpdate()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${userId}` }, payload => {
      const data = getLocal()
      if (payload.eventType === 'DELETE') {
        data.tasks = data.tasks.filter(t => t.id !== payload.old.id)
      } else {
        const task = dbToTask(payload.new as Record<string, unknown>)
        const idx = data.tasks.findIndex(t => t.id === task.id)
        if (idx !== -1) data.tasks[idx] = task
        else data.tasks.push(task)
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      onUpdate()
    })
    .subscribe(status => {
      if (status === 'CHANNEL_ERROR') console.error('[realtime] channel error — check Realtime is enabled on projects/tasks tables in Supabase')
      if (status === 'TIMED_OUT') console.error('[realtime] subscription timed out')
    })

  return channel
}

// DB <-> app model conversions
function projectToDb(p: Project, userId: string) {
  return {
    id: p.id,
    user_id: userId,
    title: p.title,
    goal: p.goal,
    scope: p.scope,
    created_at: p.createdAt,
    archived_at: p.archivedAt ?? null,
    focused: p.focused ?? false,
  }
}

function dbToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    title: row.title as string,
    goal: row.goal as string,
    scope: row.scope as string,
    createdAt: row.created_at as string,
    archivedAt: (row.archived_at as string | null) ?? undefined,
    focused: (row.focused as boolean) ?? false,
  }
}

function taskToDb(t: Task, userId: string) {
  return {
    id: t.id,
    project_id: t.projectId,
    user_id: userId,
    title: t.title,
    notes: t.notes,
    status: t.status,
    type: t.type,
    order: t.order,
    completed_at: t.completedAt ?? null,
    reflection: t.reflection ?? null,
    created_at: t.createdAt,
    links: t.links ?? [],
  }
}

function dbToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    title: row.title as string,
    notes: row.notes as string,
    status: row.status as Task['status'],
    type: row.type as Task['type'],
    order: row.order as number,
    completedAt: (row.completed_at as string | null) ?? undefined,
    reflection: (row.reflection as string | null) ?? undefined,
    createdAt: row.created_at as string,
    links: (row.links as string[]) ?? [],
  }
}
