"use client";

import { CreateHabitDialog } from "@/domains/habits/components/create-habit-dialog";
import { HabitItem } from "@/domains/habits/components/habit-item";
import { useHabitsWithProgress } from "@/domains/habits/queries/use-habits-with-progress";
import { isExpectedDay } from "@/domains/habits/utils/streak";
import { useWalkLogsToday } from "@/domains/health/queries/use-walk-logs-today";
import { useWaterToday } from "@/domains/health/queries/use-water-today";
import { useWeightLogs } from "@/domains/health/queries/use-weight-logs";
import { isoWeekKey } from "@/domains/health/utils/iso-week";
import { HealthMissionItem } from "@/domains/missions/components/health-mission-item";
import {
  buildDailyMissions,
  HEALTH_MISSION_XP,
} from "@/domains/missions/utils/build-daily-missions";
import { useMealPlansWithStatus } from "@/domains/nutrition/queries/use-meal-plans-with-status";
import { DailyReviewDialog } from "@/domains/reviews/components/daily-review-dialog";
import { useProfile } from "@/domains/settings/queries/use-profile";
import { CreateTaskDialog } from "@/domains/tasks/components/create-task-dialog";
import { TaskItem } from "@/domains/tasks/components/task-item";
import { useTodayTasks } from "@/domains/tasks/queries/use-today-tasks";
import { useWeeklyPlan } from "@/domains/planning/queries/use-weekly-plan";
import { useRecentSessions } from "@/domains/workouts/queries/use-recent-sessions";
import { useWorkoutPlans } from "@/domains/workouts/queries/use-workout-plans";
import { XpHeader } from "@/domains/xp/components/xp-header";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { todayLocalDateString } from "@/shared/lib/date/local-date";
import { getWeekStartDate } from "@/shared/lib/date/week";

export default function HomePage() {
  const { data: profile, isLoading: isLoadingProfile } = useProfile();
  const timezone = profile?.timezone ?? "America/Sao_Paulo";
  const today = todayLocalDateString(timezone);

  const { data: tasksData, isLoading: isLoadingTasks } =
    useTodayTasks(timezone);
  const { data: habits = [], isLoading: isLoadingHabits } =
    useHabitsWithProgress(timezone);
  const weekStart = profile ? getWeekStartDate(today, profile.weekStart) : null;
  const { data: weeklyPlan } = useWeeklyPlan(weekStart ?? "");

  // Fontes de missão de saúde (Fase 2) — a mesma projeção pura usada pela
  // Tela Hoje, alimentada com dados reais das tabelas de saúde. Nenhuma
  // dessas queries concede XP; elas só leem o estado atual.
  const { data: weightLogs = [] } = useWeightLogs(today);
  const { data: waterToday } = useWaterToday(today);
  const { data: mealPlans = [] } = useMealPlansWithStatus(today);
  const { data: workoutPlans = [] } = useWorkoutPlans();
  const { data: recentSessions = [] } = useRecentSessions();
  const { data: walkLogsToday = [] } = useWalkLogsToday(today);

  const habitsForToday = habits.filter((habit) =>
    isExpectedDay(today, habit.frequency, habit.daysOfWeek),
  );

  const missionsSummary = buildDailyMissions(
    (tasksData?.todayTasks ?? []).map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      xpReward: task.xpReward,
    })),
    habitsForToday.map((habit) => ({
      id: habit.id,
      name: habit.name,
      xpReward: habit.xpReward,
      completedToday: habit.completedToday,
    })),
    {
      weight: {
        loggedThisWeek: weightLogs.some(
          (log) => isoWeekKey(log.date) === isoWeekKey(today),
        ),
        xpReward: HEALTH_MISSION_XP.WEIGHT,
      },
      water: {
        totalMl: waterToday?.totalMl ?? 0,
        goalMl: waterToday?.settings.dailyGoalMl ?? 2000,
        xpReward: HEALTH_MISSION_XP.WATER,
      },
      meals: mealPlans.map((meal) => ({
        id: meal.id,
        name: meal.name,
        completedToday: meal.statusToday === "realizada",
        xpReward: HEALTH_MISSION_XP.MEAL,
      })),
      workout: {
        hasActivePlan: workoutPlans.length > 0,
        completedToday: recentSessions.some(
          (session) => session.date === today && session.completedAt != null,
        ),
        xpReward: HEALTH_MISSION_XP.WORKOUT,
      },
      walk: {
        loggedToday: walkLogsToday.length > 0,
        xpReward: HEALTH_MISSION_XP.WALK,
      },
    },
  );

  const healthMissions = missionsSummary.missions.filter(
    (m) => m.type !== "task" && m.type !== "habit",
  );

  if (isLoadingProfile) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Olá{profile?.name ? `, ${profile.name}` : ""}
        </h1>
        <XpHeader />
      </div>

      {weeklyPlan && weeklyPlan.topPriorities.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-muted-foreground text-sm font-semibold">
            Prioridades da semana
          </h2>
          <ul className="flex flex-col gap-1">
            {weeklyPlan.topPriorities.map((priority, i) => (
              <li key={i} className="text-sm">
                • {priority}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tasksData && tasksData.overdueTasks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-destructive text-sm font-semibold">Atrasadas</h2>
          <ul className="flex flex-col gap-2">
            {tasksData.overdueTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-muted-foreground text-sm font-semibold">
            Missões de hoje
          </h2>
          <div className="flex gap-2">
            <CreateTaskDialog defaultDueDate={today} />
            <CreateHabitDialog />
          </div>
        </div>

        {!isLoadingTasks &&
          !isLoadingHabits &&
          missionsSummary.totalCount > 0 && (
            <div className="flex flex-col gap-1">
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>
                  {missionsSummary.completedCount}/{missionsSummary.totalCount}{" "}
                  concluídas
                </span>
                <span>
                  +{missionsSummary.xpEarned} de {missionsSummary.xpAvailable}{" "}
                  XP
                </span>
              </div>
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${missionsSummary.progressPercent}%` }}
                />
              </div>
            </div>
          )}

        {(isLoadingTasks || isLoadingHabits) && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        )}

        {!isLoadingTasks &&
          !isLoadingHabits &&
          tasksData?.todayTasks.length === 0 &&
          habitsForToday.length === 0 &&
          healthMissions.length === 0 && (
            <p className="text-muted-foreground rounded-md border border-dashed p-4 text-center text-sm">
              Nada planejado para hoje ainda. Que tal adicionar uma tarefa ou um
              hábito?
            </p>
          )}

        <ul className="flex flex-col gap-2">
          {tasksData?.todayTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
          {habitsForToday.map((habit) => (
            <HabitItem key={habit.id} habit={habit} timezone={timezone} />
          ))}
          {healthMissions.map((mission) => (
            <HealthMissionItem key={mission.key} mission={mission} />
          ))}
        </ul>
      </section>

      <DailyReviewDialog date={today} />
    </div>
  );
}
