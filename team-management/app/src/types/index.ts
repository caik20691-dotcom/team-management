// 工作SOP模块类型
export interface SOP {
  id: string;
  title: string;
  category: string;
  owner: string;
  status: 'draft' | 'active' | 'archived';
  version: string;
  updatedAt: string;
  content: string;
}

// 制度文档模块类型
export interface Policy {
  id: string;
  title: string;
  category: string;
  department: string;
  effectiveDate: string;
  status: 'active' | 'draft' | 'expired';
  summary: string;
}

// 任务管理模块类型
export interface Task {
  id: string;
  title: string;
  assignee: string;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  dueDate: string;
  tags: string[];
}

// 信息同步模块类型
export interface SyncItem {
  id: string;
  title: string;
  content: string;
  author: string;
  target: string;
  status: 'pending' | 'sent' | 'read';
  createdAt: string;
}

// 业务规则模块类型
export interface BusinessRule {
  id: string;
  name: string;
  category: string;
  description: string;
  condition: string;
  action: string;
  status: 'active' | 'inactive';
  updatedAt: string;
}

// 工作清单模块类型
export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  responsible: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'on_demand';
  status: 'pending' | 'completed' | 'overdue';
  lastDone: string | null;
}

// 团队成员类型
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
}
