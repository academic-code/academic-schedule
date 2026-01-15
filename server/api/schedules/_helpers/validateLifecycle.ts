import { createError } from "h3"
import type { ScheduleStatus } from "./types"

export function validateLifecycle(
  oldStatus: ScheduleStatus | null,
  newStatus: ScheduleStatus
) {
  if (!oldStatus && newStatus === "DRAFT") return
  if (oldStatus === "DRAFT" && newStatus === "PUBLISHED") return
  if (oldStatus === "PUBLISHED" && newStatus === "ARCHIVED") return

  throw createError({
    statusCode: 400,
    message: `Invalid lifecycle transition ${oldStatus} → ${newStatus}`
  })
}
