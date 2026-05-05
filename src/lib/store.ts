import { v4 as uuidv4 } from 'uuid'
import {
  syncProject, syncTask, syncDeleteProject, syncDeleteTask, syncTasks,
} from './supabase'

export type TaskStatus = 'queued' | 'active' | 'done'
export type TaskType = 'task' | 'idea'

export interface Task {
  id: string
  projectId: string
  title: string
  notes: string
  status: TaskStatus
  type: TaskType
  order: number
  completedAt?: string
  reflection?: string
  createdAt: string
  links?: string[]
}

export interface Project {
  id: string
  title: string
  goal: string
  scope: string
  createdAt: string
  archivedAt?: string
  focused?: boolean
}

export interface AppData {
  projects: Project[]
  tasks: Task[]
}

const STORAGE_KEY = 'mastery-app-v1'

function defaultData(): AppData {
  return { projects: [], tasks: [] }
}

export function loadData(): AppData {
  if (typeof window === 'undefined') return defaultData()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultData()
    return JSON.parse(raw) as AppData
  } catch {
    return defaultData()
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

// Projects
export function createProject(title: string, goal: string, scope: string): Project {
  const data = loadData()
  const project: Project = {
    id: uuidv4(),
    title,
    goal,
    scope,
    createdAt: new Date().toISOString(),
    focused: true,
  }
  data.projects.push(project)
  saveData(data)
  syncProject(project).catch(() => {})
  return project
}

export function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): void {
  const data = loadData()
  const idx = data.projects.findIndex(p => p.id === id)
  if (idx !== -1) {
    data.projects[idx] = { ...data.projects[idx], ...updates }
    saveData(data)
    syncProject(data.projects[idx]).catch(() => {})
  }
}

export function toggleProjectFocus(id: string): void {
  const data = loadData()
  const idx = data.projects.findIndex(p => p.id === id)
  if (idx !== -1) {
    data.projects[idx] = { ...data.projects[idx], focused: !data.projects[idx].focused }
    saveData(data)
  }
}

export function archiveProject(id: string): void {
  updateProject(id, { archivedAt: new Date().toISOString() })
}

export function deleteProject(id: string): void {
  const data = loadData()
  data.projects = data.projects.filter(p => p.id !== id)
  data.tasks = data.tasks.filter(t => t.projectId !== id)
  saveData(data)
  syncDeleteProject(id).catch(() => {})
}

// Tasks
export function getProjectTasks(projectId: string, data?: AppData): Task[] {
  const d = data || loadData()
  return d.tasks
    .filter(t => t.projectId === projectId)
    .sort((a, b) => a.order - b.order)
}

export function getActiveTask(projectId: string): Task | undefined {
  return getProjectTasks(projectId).find(t => t.status === 'active' && t.type === 'task')
}

export function getQueuedTasks(projectId: string): Task[] {
  return getProjectTasks(projectId).filter(t => t.status === 'queued' && t.type === 'task')
}

export function getIdeas(projectId: string): Task[] {
  return getProjectTasks(projectId).filter(t => t.type === 'idea')
}

export function getCompletedTasks(projectId: string): Task[] {
  return getProjectTasks(projectId).filter(t => t.status === 'done' && t.type === 'task')
}

export function addTask(projectId: string, title: string, notes: string, type: TaskType = 'task'): Task {
  const data = loadData()
  const projectTasks = getProjectTasks(projectId, data)
  const maxOrder = projectTasks.length > 0 ? Math.max(...projectTasks.map(t => t.order)) : 0

  // If no active task exists and type is task, make this one active
  const hasActive = projectTasks.some(t => t.status === 'active' && t.type === 'task')
  const status: TaskStatus = (type === 'task' && !hasActive) ? 'active' : 'queued'

  const task: Task = {
    id: uuidv4(),
    projectId,
    title,
    notes,
    status,
    type,
    order: maxOrder + 1,
    createdAt: new Date().toISOString(),
  }
  data.tasks.push(task)
  saveData(data)
  syncTask(task).catch(() => {})
  return task
}

export function completeTask(taskId: string, reflection?: string): void {
  const data = loadData()
  const taskIdx = data.tasks.findIndex(t => t.id === taskId)
  if (taskIdx === -1) return

  const task = data.tasks[taskIdx]
  data.tasks[taskIdx] = {
    ...task,
    status: 'done',
    completedAt: new Date().toISOString(),
    reflection: reflection || task.reflection || '',
  }

  const affected = [data.tasks[taskIdx]]

  // Promote next queued task for this project
  const queued = data.tasks
    .filter(t => t.projectId === task.projectId && t.status === 'queued' && t.type === 'task')
    .sort((a, b) => a.order - b.order)

  if (queued.length > 0) {
    const nextIdx = data.tasks.findIndex(t => t.id === queued[0].id)
    if (nextIdx !== -1) {
      data.tasks[nextIdx].status = 'active'
      affected.push(data.tasks[nextIdx])
    }
  }

  saveData(data)
  syncTasks(affected).catch(() => {})
}

export function requeueTask(taskId: string): void {
  const data = loadData()
  const taskIdx = data.tasks.findIndex(t => t.id === taskId)
  if (taskIdx === -1) return
  const task = data.tasks[taskIdx]
  const hasActive = data.tasks.some(t => t.projectId === task.projectId && t.status === 'active' && t.type === 'task')
  data.tasks[taskIdx] = {
    ...task,
    status: hasActive ? 'queued' : 'active',
    completedAt: undefined,
  }
  saveData(data)
  syncTask(data.tasks[taskIdx]).catch(() => {})
}

export function reorderTasks(projectId: string, taskIds: string[]): void {
  const data = loadData()
  const reordered: Task[] = []
  taskIds.forEach((id, index) => {
    const idx = data.tasks.findIndex(t => t.id === id)
    if (idx !== -1) {
      data.tasks[idx].order = index + 1
      reordered.push(data.tasks[idx])
    }
  })
  saveData(data)
  syncTasks(reordered).catch(() => {})
}

export function updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>): void {
  const data = loadData()
  const idx = data.tasks.findIndex(t => t.id === taskId)
  if (idx !== -1) {
    data.tasks[idx] = { ...data.tasks[idx], ...updates }
    saveData(data)
    syncTask(data.tasks[idx]).catch(() => {})
  }
}

export function deleteTask(taskId: string): void {
  const data = loadData()
  data.tasks = data.tasks.filter(t => t.id !== taskId)
  saveData(data)
  syncDeleteTask(taskId).catch(() => {})
}

export function swapActiveTask(queuedTaskId: string): void {
  const data = loadData()
  const newActiveIdx = data.tasks.findIndex(t => t.id === queuedTaskId)
  if (newActiveIdx === -1) return
  const newActive = data.tasks[newActiveIdx]
  const currentActiveIdx = data.tasks.findIndex(
    t => t.projectId === newActive.projectId && t.status === 'active' && t.type === 'task'
  )
  const affected: Task[] = []
  if (currentActiveIdx !== -1) {
    data.tasks[currentActiveIdx].status = 'queued'
    affected.push(data.tasks[currentActiveIdx])
  }
  data.tasks[newActiveIdx].status = 'active'
  affected.push(data.tasks[newActiveIdx])
  saveData(data)
  syncTasks(affected).catch(() => {})
}

export function promoteIdea(taskId: string): void {
  const data = loadData()
  const idx = data.tasks.findIndex(t => t.id === taskId)
  if (idx === -1) return
  const task = data.tasks[idx]
  const hasActive = data.tasks.some(t => t.projectId === task.projectId && t.status === 'active' && t.type === 'task')
  data.tasks[idx] = {
    ...task,
    type: 'task',
    status: hasActive ? 'queued' : 'active',
  }
  saveData(data)
  syncTask(data.tasks[idx]).catch(() => {})
}
