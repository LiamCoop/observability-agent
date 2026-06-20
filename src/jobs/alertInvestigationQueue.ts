import { createHash } from "node:crypto";
import { Queue, type JobsOptions } from "bullmq";
import type { GrafanaWebhook } from "../api/grafanaWebhook";

export const ALERT_INVESTIGATION_QUEUE_NAME = "alert-investigations";
export const INVESTIGATE_GRAFANA_ALERT_JOB_NAME = "investigate-grafana-alert";

export type AlertInvestigationJobData = {
  payload: GrafanaWebhook;
  receivedAt: string;
};

export const redisConnection = {
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  username: process.env.REDIS_USERNAME || undefined,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB ?? 0),
};

export const alertInvestigationQueue = new Queue<AlertInvestigationJobData>(ALERT_INVESTIGATION_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: Number(process.env.ALERT_INVESTIGATION_ATTEMPTS ?? 3),
    backoff: {
      type: "exponential",
      delay: Number(process.env.ALERT_INVESTIGATION_BACKOFF_MS ?? 5_000),
    },
    removeOnComplete: { age: Number(process.env.ALERT_INVESTIGATION_COMPLETED_TTL_SECONDS ?? 86_400), count: 1_000 },
    removeOnFail: { age: Number(process.env.ALERT_INVESTIGATION_FAILED_TTL_SECONDS ?? 604_800) },
  },
});

export function createAlertInvestigationJobId(payload: GrafanaWebhook): string {
  const fingerprints = payload.alerts.map((alert) => alert.fingerprint).sort().join(",");
  const dedupeKey = [payload.groupKey, payload.status, fingerprints, payload.alerts[0]?.startsAt].join("|");
  return createHash("sha256").update(dedupeKey).digest("hex");
}

export async function enqueueAlertInvestigation(
  payload: GrafanaWebhook,
  options: JobsOptions = {},
) {
  return alertInvestigationQueue.add(
    INVESTIGATE_GRAFANA_ALERT_JOB_NAME,
    { payload, receivedAt: new Date().toISOString() },
    {
      jobId: createAlertInvestigationJobId(payload),
      ...options,
    },
  );
}
