import "dotenv/config";
import { Worker, QueueEvents, type Job } from "bullmq";
import { debugWithGrafanaGraph } from "../graph";
import {
  ALERT_INVESTIGATION_QUEUE_NAME,
  INVESTIGATE_GRAFANA_ALERT_JOB_NAME,
  redisConnection,
  type AlertInvestigationJobData,
} from "../jobs/alertInvestigationQueue";
import type { GrafanaWebhook } from "../api/grafanaWebhook";

const SERVICE_NAME_KEYS = [
  "service",
  "serviceName",
  "service_name",
  "service.name",
  "job",
  "app",
  "application",
  "container",
  "pod",
];

function normalizeServiceName(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function pickLabel(payload: GrafanaWebhook, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = normalizeServiceName(payload.commonLabels[key] ?? payload.groupLabels[key]);
    if (value) return value;
  }

  for (const alert of payload.alerts) {
    for (const key of keys) {
      const value = normalizeServiceName(alert.labels[key]);
      if (value) return value;
    }
  }

  return undefined;
}

function pickAnnotation(payload: GrafanaWebhook, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = normalizeServiceName(payload.commonAnnotations[key]);
    if (value) return value;
  }

  for (const alert of payload.alerts) {
    for (const key of keys) {
      const value = normalizeServiceName(alert.annotations[key]);
      if (value) return value;
    }
  }

  return undefined;
}

function pickExplicitServiceName(payload: GrafanaWebhook): string | undefined {
  return (
    normalizeServiceName(payload.serviceName) ??
    normalizeServiceName(payload.service_name) ??
    normalizeServiceName(payload.service) ??
    normalizeServiceName(payload.investigation?.serviceName) ??
    normalizeServiceName(payload.investigation?.service_name) ??
    normalizeServiceName(payload.investigation?.service)
  );
}

function getServiceName(payload: GrafanaWebhook): string {
  const serviceName =
    pickExplicitServiceName(payload) ?? pickLabel(payload, SERVICE_NAME_KEYS) ?? pickAnnotation(payload, SERVICE_NAME_KEYS);

  if (!serviceName) {
    throw new Error(
      `Could not infer service name from Grafana webhook. Add a service/service_name/job label, annotation, or custom payload serviceName. groupKey=${payload.groupKey}`,
    );
  }

  return serviceName;
}

function investigationWindow(payload: GrafanaWebhook): { from: string; to: string } {
  const startsAt = payload.alerts
    .map((alert) => new Date(alert.startsAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];

  const endsAt = payload.alerts
    .map((alert) => new Date(alert.endsAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];

  const from = startsAt ? new Date(startsAt - 30 * 60 * 1000).toISOString() : "now-1h";
  const to = payload.status === "resolved" && endsAt ? new Date(endsAt + 5 * 60 * 1000).toISOString() : "now";

  return { from, to };
}

async function investigateGrafanaAlert(job: Job<AlertInvestigationJobData>) {
  if (job.name !== INVESTIGATE_GRAFANA_ALERT_JOB_NAME) {
    throw new Error(`Unsupported job name: ${job.name}`);
  }

  const { payload } = job.data;
  const serviceName = getServiceName(payload);
  const { from, to } = investigationWindow(payload);

  await job.updateProgress({ phase: "running-graph", serviceName, from, to });

  const result = await debugWithGrafanaGraph.invoke({
    serviceName,
    from,
    to,
    step: process.env.ALERT_INVESTIGATION_STEP ?? "1m",
  });

  await job.updateProgress({ phase: "completed", serviceName });

  return {
    serviceName,
    from,
    to,
    summary: result.summary,
    findings: result.findings,
    toolCalls: result.toolCalls,
  };
}

const concurrency = Number(process.env.ALERT_INVESTIGATION_WORKER_CONCURRENCY ?? 1);

const worker = new Worker<AlertInvestigationJobData>(
  ALERT_INVESTIGATION_QUEUE_NAME,
  investigateGrafanaAlert,
  { connection: redisConnection, concurrency },
);

const queueEvents = new QueueEvents(ALERT_INVESTIGATION_QUEUE_NAME, { connection: redisConnection });

worker.on("ready", () => {
  console.log(`Alert investigation worker ready: queue=${ALERT_INVESTIGATION_QUEUE_NAME} concurrency=${concurrency}`);
});

worker.on("failed", (job, error) => {
  console.error({ jobId: job?.id, error }, "Alert investigation job failed");
});

worker.on("completed", (job, result) => {
  console.log({ jobId: job.id, result }, "Alert investigation job completed");
});

async function shutdown(signal: NodeJS.Signals) {
  console.log(`Received ${signal}; shutting down alert investigation worker`);
  await worker.close();
  await queueEvents.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
