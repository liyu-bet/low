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
  | 'canceled';

export type TaskFilters = {
  focus: TaskFocus;
  q: string;
  websiteId: string;
  group: string;
  priority: '' | TaskPriority;
  status: '' | TaskStatus;
  action: '' | 'create';
};

export type TaskSummary = {
  overdue: number;
  today: number;
  upcoming7: number;
  noDue: number;
  inProgress: number;
  done: number;
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
