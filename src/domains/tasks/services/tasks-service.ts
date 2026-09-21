import type { SupabaseClient } from "@supabase/supabase-js";

import type { CreateTaskInput } from "../schemas/task-schema";
import { mapTaskRow, type Task, type TaskRow } from "../types/task";

function throwFriendly(message: string): never {
  throw new Error(message);
}

export async function listTasksForToday(
  supabase: SupabaseClient,
  todayLocalDate: string,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("due_date", todayLocalDate)
    .neq("status", "cancelada")
    .order("priority", { ascending: false })
    .returns<TaskRow[]>();

  if (error) throwFriendly("Não foi possível carregar as tarefas de hoje.");
  return (data ?? []).map(mapTaskRow);
}

export async function listOverdueTasks(
  supabase: SupabaseClient,
  todayLocalDate: string,
): Promise<Task[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .lt("due_date", todayLocalDate)
    .in("status", ["pendente", "em_andamento"])
    .order("due_date", { ascending: true })
    .returns<TaskRow[]>();

  if (error) throwFriendly("Não foi possível carregar as tarefas atrasadas.");
  return (data ?? []).map(mapTaskRow);
}

export async function createTask(
  supabase: SupabaseClient,
  input: CreateTaskInput,
): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: input.title,
      description: input.description || null,
      priority: input.priority,
      due_date: input.dueDate || null,
      estimated_minutes: input.estimatedMinutes ?? null,
      xp_reward: input.xpReward,
    })
    .select("*")
    .single<TaskRow>();

  if (error) throwFriendly("Não foi possível criar a tarefa.");
  return mapTaskRow(data!);
}

export type CompleteTaskResult = {
  task: Task;
  xpAwarded: boolean;
  xpAmount: number;
};

type CompleteTaskRpcResult = {
  task_row: TaskRow;
  xp_awarded: boolean;
  xp_amount: number;
};

export async function completeTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<CompleteTaskResult> {
  const { data, error } = await supabase
    .rpc("complete_task", { p_task_id: taskId })
    .single<CompleteTaskRpcResult>();

  if (error) throwFriendly("Não foi possível concluir a tarefa.");
  return {
    task: mapTaskRow(data!.task_row),
    xpAwarded: data!.xp_awarded,
    xpAmount: data!.xp_amount,
  };
}

export async function uncompleteTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<Task> {
  const { data, error } = await supabase
    .rpc("uncomplete_task", { p_task_id: taskId })
    .single<TaskRow>();

  if (error) throwFriendly("Não foi possível reabrir a tarefa.");
  return mapTaskRow(data!);
}

export async function deleteTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throwFriendly("Não foi possível excluir a tarefa.");
}
