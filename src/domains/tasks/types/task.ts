export type TaskPriority = "baixa" | "media" | "alta" | "critica";
export type TaskStatus =
  "pendente" | "em_andamento" | "concluida" | "cancelada";

export type Task = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string | null;
  dueTime: string | null;
  estimatedMinutes: number | null;
  xpReward: number;
  recurrenceId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  due_date: string | null;
  due_time: string | null;
  estimated_minutes: number | null;
  xp_reward: number;
  recurrence_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    dueTime: row.due_time,
    estimatedMinutes: row.estimated_minutes,
    xpReward: row.xp_reward,
    recurrenceId: row.recurrence_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}
