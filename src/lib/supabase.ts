import { createClient } from '@supabase/supabase-js'
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
  const { data } = await supabase.auth.getUser()
  return data.user
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

  const [projectsRes, tasksRes] = await Promise.all([
    dbProjects.length > 0
      ? supabase.from('projects').upsert(dbProjects, { onConflict: 'id' })
      : Promise.resolve({ error: null }),
    dbTasks.length > 0
      ? supabase.from('tasks').upsert(dbTasks, { onConflict: 'id' })
      : Promise.resolve({ error: null }),
  ])

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
