import type { TaskPriority, TaskStatus } from '@prisma/client';
import type { TaskDueBucket } from '@/lib/tasks/classify';

export type TaskFocus =
  | 'open'
  | 'overdue'
  | 'today'
  | 'upcoming'
  | 'no_due'
  | 'in_progress'
  | 'done'
  | 'canceled'
  | 'mine';

export type TaskFilters = {
  focus: TaskFocus;
  q: string;
  websiteId: string;
  group: string;
  priority: '' | TaskPriority;
  status: '' | TaskStatus;
  action: '' | 'create';
  assignedToUserId: string;
  createdByUserId: string;
  /** Injected for "mine" tab — not from URL. */
  currentUserId?: string;
};

export type TaskSummary = {
  overdue: number;
  today: number;
  upcoming7: number;
  noDue: number;
  inProgress: number;
  done: number;
  mine: number;
};

export type TaskUserRef = {
  id: string;
  name: string;
  email: string;
};

export type TaskListItem = {
  id: string;
  websiteId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: Date | null;
  completedAt: Date | null;
  result: string | null;
  createdAt: Date;
  updatedAt: Date;
  dueBucket: TaskDueBucket;
  dueRelative: string;
  daysUntil: number | null;
  createdByUserId: string | null;
  assignedToUserId: string | null;
  completedByUserId: string | null;
  createdByLabel: string;
  assignedToLabel: string | null;
  completedByLabel: string | null;
  website: {
    id: string;
    domain: string;
    name: string | null;
    group: string | null;
    archivedAt: Date | null;
  };
};

export type WebsiteOption = {
  id: string;
  domain: string;
  name: string | null;
  group: string | null;
};

export type TasksPageData = {
  summary: TaskSummary;
  items: TaskListItem[];
  filteredItems: TaskListItem[];
  filters: TaskFilters;
  websites: WebsiteOption[];
  groups: string[];
  users: Array<{ id: string; name: string; email: string }>;
};

export type WebsiteTasksBlockData = {
  openTasks: TaskListItem[];
  recentDone: TaskListItem[];
};

export type DashboardTaskItem = {
  id: string;
  websiteId: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: Date | null;
  dueRelative: string;
  dueBucket: TaskDueBucket;
  domain: string;
};

export type OverdueTasksByWebsite = Map<
  string,
  { count: number; priorities: TaskPriority[] }
>;
