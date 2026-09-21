"use client";

import { useQuery } from "@tanstack/react-query";

import { todayLocalDateString } from "@/shared/lib/date/local-date";
import { QUERY_KEYS } from "@/shared/lib/query-keys";
import { createClient } from "@/shared/lib/supabase/client";

import { listOverdueTasks, listTasksForToday } from "../services/tasks-service";

export function useTodayTasks(timezone: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.tasks, "today", timezone],
    queryFn: async () => {
      const supabase = createClient();
      const today = todayLocalDateString(timezone);
      const [todayTasks, overdueTasks] = await Promise.all([
        listTasksForToday(supabase, today),
        listOverdueTasks(supabase, today),
      ]);
      return { todayTasks, overdueTasks };
    },
  });
}
