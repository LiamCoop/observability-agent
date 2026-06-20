import Fastify from "fastify";
import { z } from "zod";

const app = Fastify({ logger: true });

const GrafanaAlertStatusSchema = z.enum(["firing", "resolved"]);
const LabelSetSchema = z.record(z.string(), z.string());
const AnnotationSetSchema = z.record(z.string(), z.string());
const UrlOrEmptyStringSchema = z.union([z.url(), z.literal("")]);

const GrafanaAlertSchema = z.object({
  status: GrafanaAlertStatusSchema,
  labels: LabelSetSchema,
  annotations: AnnotationSetSchema,
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  generatorURL: z.url(),
  fingerprint: z.string(),
  silenceURL: z.url(),
  dashboardURL: UrlOrEmptyStringSchema,
  panelURL: UrlOrEmptyStringSchema,
  values: z.record(z.string(), z.number()),
});

const GrafanaWebhookSchema = z.object({
  receiver: z.string(),
  status: GrafanaAlertStatusSchema,
  orgId: z.number().int().nonnegative(),
  alerts: z.array(GrafanaAlertSchema),
  groupLabels: LabelSetSchema,
  commonLabels: LabelSetSchema,
  commonAnnotations: AnnotationSetSchema,
  externalURL: z.url(),
  version: z.string(),
  groupKey: z.string(),
  truncatedAlerts: z.number().int().nonnegative(),
  title: z.string(),
  state: z.string(),
  message: z.string(),
});

app.post("/webhooks/grafana/alert", async (request, reply) => {
  const payload = GrafanaWebhookSchema.parse(request.body);

  // enqueue job / create investigation run
  // await investigationQueue.add("investigate-alert", payload);

  return reply.code(202).send({ ok: true });
});

await app.listen({ host: "0.0.0.0", port: 8080 });
