import { prisma } from "./prisma";

/**
 * Logs an activity event asynchronously. Wraps execution in a try-catch block
 * to ensure telemetry logging failures do not block main user flows.
 */
export async function logActivityEvent(
  userId: string | null,
  type: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await prisma.activityEvent.create({
      data: {
        userId,
        type,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write activity log event:", error);
  }
}
