export type PoolLifecycleStatus =
  | "open"
  | "ready"
  | "active"
  | "action_required"
  | "completed";

export type PoolLifecycleAction =
  | "wait_for_members"
  | "start_pool"
  | "collect_deposits"
  | "resolve_cycle"
  | "none";

export interface PoolLifecycleInput {
  started: boolean;
  active: boolean;
  ended: boolean;
  full: boolean;
  currentCycle: number;
  poolStartTimeMs: number;
  cycleDurationMs: number;
}

export interface PoolLifecycleState {
  status: PoolLifecycleStatus;
  nextAction: PoolLifecycleAction;
  cycleDeadlineMs: number | null;
  deadlineReached: boolean;
  remainingMs: number | null;
}

export function derivePoolLifecycle(
  pool: PoolLifecycleInput,
  nowMs = Date.now(),
): PoolLifecycleState {
  if (pool.ended || (pool.started && !pool.active)) {
    return {
      status: "completed",
      nextAction: "none",
      cycleDeadlineMs: null,
      deadlineReached: false,
      remainingMs: null,
    };
  }

  if (!pool.started) {
    return {
      status: pool.full ? "ready" : "open",
      nextAction: pool.full ? "start_pool" : "wait_for_members",
      cycleDeadlineMs: null,
      deadlineReached: false,
      remainingMs: null,
    };
  }

  const hasDeadline =
    pool.poolStartTimeMs > 0 &&
    pool.currentCycle > 0 &&
    pool.cycleDurationMs > 0;
  const cycleDeadlineMs = hasDeadline
    ? pool.poolStartTimeMs + pool.currentCycle * pool.cycleDurationMs
    : null;
  const deadlineReached = cycleDeadlineMs !== null && nowMs >= cycleDeadlineMs;

  return {
    status: deadlineReached ? "action_required" : "active",
    nextAction: deadlineReached ? "resolve_cycle" : "collect_deposits",
    cycleDeadlineMs,
    deadlineReached,
    remainingMs: cycleDeadlineMs === null ? null : Math.max(0, cycleDeadlineMs - nowMs),
  };
}

export function getPoolStatusLabel(status: PoolLifecycleStatus): string {
  switch (status) {
    case "open":
      return "Open";
    case "ready":
      return "Ready to Start";
    case "active":
      return "Active";
    case "action_required":
      return "Action Required";
    case "completed":
      return "Completed";
  }
}
