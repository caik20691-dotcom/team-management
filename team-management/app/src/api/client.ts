const BASE = import.meta.env.VITE_API_BASE || '';
const TIMEOUT = 10000;

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
    if (!res.ok) {
      throw new Error(`API Error: ${res.status} ${res.statusText} - ${url}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ===== Users =====
export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  role: 'admin' | 'viewer';
  avatar: string;
  department: string;
  phone: string;
  email: string;
  joinDate: string;
  status: 'active' | 'inactive';
}

export async function login(username: string, password: string): Promise<User | null> {
  try {
    const users = await request<User[]>(`${BASE}/users?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
    return users.length > 0 ? users[0] : null;
  } catch (e) {
    return null;
  }
}

export async function fetchUsers(): Promise<User[]> {
  return request<User[]>(`${BASE}/users`);
}

export async function createUser(data: Omit<User, 'id'>): Promise<User> {
  return request<User>(`${BASE}/users`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  return request<User>(`${BASE}/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await request<void>(`${BASE}/users/${id}`, { method: 'DELETE' });
}

// ===== SOPs =====
export interface SOPAttachment {
  id: string;
  name: string;
  type: string;       // MIME type
  size: number;       // bytes
  data: string;       // base64
  uploadedAt: string;
  uploadedBy: string;
}

export interface SOPVersion {
  id: string;
  sopId: string;
  version: string;
  title: string;
  category: string;
  content: string;
  attachments: SOPAttachment[];
  status: string;
  updatedBy: string;
  updatedAt: string;
  changeType: 'minor' | 'major';
  changeNote: string;
}

export interface SOP {
  id: string;
  title: string;
  category: string;
  owner: string;
  status: 'draft' | 'active' | 'archived';
  version: string;
  updatedAt: string;
  content: string;
  attachments: SOPAttachment[];
}

export async function fetchSOPs(): Promise<SOP[]> {
  return request<SOP[]>(`${BASE}/sops`);
}

export async function createSOP(data: Omit<SOP, 'id'>): Promise<SOP> {
  return request<SOP>(`${BASE}/sops`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSOP(id: string, data: Partial<SOP>): Promise<SOP> {
  return request<SOP>(`${BASE}/sops/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSOP(id: string): Promise<void> {
  await request<void>(`${BASE}/sops/${id}`, { method: 'DELETE' });
}

export async function fetchSOPVersions(sopId: string): Promise<SOPVersion[]> {
  return request<SOPVersion[]>(`${BASE}/sopVersions?sopId=${sopId}&_sort=updatedAt&_order=desc`);
}

export async function createSOPVersion(data: Omit<SOPVersion, 'id'>): Promise<SOPVersion> {
  return request<SOPVersion>(`${BASE}/sopVersions`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchSOPVersion(id: string): Promise<SOPVersion> {
  return request<SOPVersion>(`${BASE}/sopVersions/${id}`);
}

// ===== Policies =====
export interface Policy {
  id: string;
  title: string;
  category: string;
  department: string;
  effectiveDate: string;
  status: 'active' | 'draft' | 'expired';
  summary: string;
}

export async function fetchPolicies(): Promise<Policy[]> {
  return request<Policy[]>(`${BASE}/policies`);
}

export async function createPolicy(data: Omit<Policy, 'id'>): Promise<Policy> {
  return request<Policy>(`${BASE}/policies`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePolicy(id: string, data: Partial<Policy>): Promise<Policy> {
  return request<Policy>(`${BASE}/policies/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deletePolicy(id: string): Promise<void> {
  await request<void>(`${BASE}/policies/${id}`, { method: 'DELETE' });
}

// ===== Tasks =====
export interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  dueDate: string;
  tags: string[];
}

export async function fetchTasks(): Promise<Task[]> {
  return request<Task[]>(`${BASE}/tasks`);
}

export async function createTask(data: Omit<Task, 'id'>): Promise<Task> {
  return request<Task>(`${BASE}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  return request<Task>(`${BASE}/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await request<void>(`${BASE}/tasks/${id}`, { method: 'DELETE' });
}

// ===== Sync Items =====
export interface SyncItem {
  id: string;
  title: string;
  content: string;
  author: string;
  target: string;
  status: 'pending' | 'sent' | 'read';
  createdAt: string;
}

export async function fetchSyncItems(): Promise<SyncItem[]> {
  return request<SyncItem[]>(`${BASE}/syncItems`);
}

export async function createSyncItem(data: Omit<SyncItem, 'id'>): Promise<SyncItem> {
  return request<SyncItem>(`${BASE}/syncItems`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateSyncItem(id: string, data: Partial<SyncItem>): Promise<SyncItem> {
  return request<SyncItem>(`${BASE}/syncItems/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteSyncItem(id: string): Promise<void> {
  await request<void>(`${BASE}/syncItems/${id}`, { method: 'DELETE' });
}

// ===== Business Rules =====
export interface BusinessRule {
  id: string;
  name: string;
  category: string;
  description: string;
  creator: string;
  status: 'not_started' | 'active' | 'inactive';
  updatedAt: string;
}

export async function fetchBusinessRules(): Promise<BusinessRule[]> {
  return request<BusinessRule[]>(`${BASE}/businessRules`);
}

export async function createBusinessRule(data: Omit<BusinessRule, 'id'>): Promise<BusinessRule> {
  return request<BusinessRule>(`${BASE}/businessRules`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBusinessRule(id: string, data: Partial<BusinessRule>): Promise<BusinessRule> {
  return request<BusinessRule>(`${BASE}/businessRules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteBusinessRule(id: string): Promise<void> {
  await request<void>(`${BASE}/businessRules/${id}`, { method: 'DELETE' });
}

// ===== Checklist Items =====
export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  responsible: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand';
  status: 'pending' | 'completed' | 'overdue';
  lastDone: string | null;
}

export async function fetchChecklistItems(): Promise<ChecklistItem[]> {
  return request<ChecklistItem[]>(`${BASE}/checklistItems`);
}

export async function createChecklistItem(data: Omit<ChecklistItem, 'id'>): Promise<ChecklistItem> {
  return request<ChecklistItem>(`${BASE}/checklistItems`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateChecklistItem(id: string, data: Partial<ChecklistItem>): Promise<ChecklistItem> {
  return request<ChecklistItem>(`${BASE}/checklistItems/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteChecklistItem(id: string): Promise<void> {
  await request<void>(`${BASE}/checklistItems/${id}`, { method: 'DELETE' });
}

// ===== Files =====
export interface FileItem {
  id: string;
  name: string;
  category: string;
  type: string;
  size: string;
  uploader: string;
  uploadDate: string;
  url: string;
  description: string;
}

export async function fetchFiles(): Promise<FileItem[]> {
  return request<FileItem[]>(`${BASE}/files`);
}

export async function createFile(data: Omit<FileItem, 'id'>): Promise<FileItem> {
  return request<FileItem>(`${BASE}/files`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFile(id: string, data: Partial<FileItem>): Promise<FileItem> {
  return request<FileItem>(`${BASE}/files/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteFile(id: string): Promise<void> {
  await request<void>(`${BASE}/files/${id}`, { method: 'DELETE' });
}

// ===== KB Articles =====
export interface KBArticle {
  id: string;
  title: string;
  category: string;
  author: string;
  tags: string[];
  content: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  viewCount: number;
}

export async function fetchKBArticles(): Promise<KBArticle[]> {
  return request<KBArticle[]>(`${BASE}/kbArticles`);
}

export async function createKBArticle(data: Omit<KBArticle, 'id'>): Promise<KBArticle> {
  return request<KBArticle>(`${BASE}/kbArticles`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateKBArticle(id: string, data: Partial<KBArticle>): Promise<KBArticle> {
  return request<KBArticle>(`${BASE}/kbArticles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteKBArticle(id: string): Promise<void> {
  await request<void>(`${BASE}/kbArticles/${id}`, { method: 'DELETE' });
}

// ===== Announcements =====
export interface Announcement {
  id: string;
  title: string;
  content: string;
  author: string;
  priority: 'normal' | 'important' | 'urgent';
  pinned: boolean;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export async function fetchAnnouncements(): Promise<Announcement[]> {
  return request<Announcement[]>(`${BASE}/announcements`);
}

export async function createAnnouncement(data: Omit<Announcement, 'id'>): Promise<Announcement> {
  return request<Announcement>(`${BASE}/announcements`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAnnouncement(id: string, data: Partial<Announcement>): Promise<Announcement> {
  return request<Announcement>(`${BASE}/announcements/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await request<void>(`${BASE}/announcements/${id}`, { method: 'DELETE' });
}

// ===== Notifications =====
export interface Notification {
  id: string;
  userId: string;
  type: 'announcement' | 'task' | 'sop' | 'policy' | 'system';
  title: string;
  message: string;
  targetId: string;
  targetType: string;
  read: boolean;
  createdAt: string;
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const all = await request<Notification[]>(`${BASE}/notifications`);
  return all.filter(n => n.userId === userId || n.userId === 'all');
}

export async function fetchAllNotifications(): Promise<Notification[]> {
  return request<Notification[]>(`${BASE}/notifications`);
}

export async function markNotificationRead(id: string): Promise<Notification> {
  return request<Notification>(`${BASE}/notifications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ read: true }),
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const all = await request<Notification[]>(`${BASE}/notifications`);
  const userNotifs = all.filter(n => n.userId === userId || n.userId === 'all');
  await Promise.all(
    userNotifs.filter(n => !n.read).map(n =>
      request<Notification>(`${BASE}/notifications/${n.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ read: true }),
      })
    )
  );
}

export async function createNotification(data: Omit<Notification, 'id'>): Promise<Notification> {
  return request<Notification>(`${BASE}/notifications`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function deleteNotification(id: string): Promise<void> {
  await request<void>(`${BASE}/notifications/${id}`, { method: 'DELETE' });
}

// ===== Calendar Events =====
export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  type: 'meeting' | 'deadline' | 'milestone' | 'leave' | 'recurring';
  date: string;
  startTime: string;
  endTime: string;
  organizer: string;
  participants: string[];
  color: string;
  relatedTaskId: string | null;
  createdAt: string;
}

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  return request<CalendarEvent[]>(`${BASE}/calendarEvents`);
}

export async function createCalendarEvent(data: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
  return request<CalendarEvent>(`${BASE}/calendarEvents`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCalendarEvent(id: string, data: Partial<CalendarEvent>): Promise<CalendarEvent> {
  return request<CalendarEvent>(`${BASE}/calendarEvents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await request<void>(`${BASE}/calendarEvents/${id}`, { method: 'DELETE' });
}

// ===== Projects =====
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high';
  startDate: string;
  endDate: string;
  owner: string;
  members: string[];
  progress: number;
  relatedTasks: string[];
  createdAt: string;
  updatedAt: string;
}

export async function fetchProjects(): Promise<Project[]> {
  return request<Project[]>(`${BASE}/projects`);
}

export async function createProject(data: Omit<Project, 'id'>): Promise<Project> {
  return request<Project>(`${BASE}/projects`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  return request<Project>(`${BASE}/projects/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<void> {
  await request<void>(`${BASE}/projects/${id}`, { method: 'DELETE' });
}
