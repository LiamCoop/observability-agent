import { z } from "zod";

export const GrafanaAlertStatusSchema = z.enum(["firing", "resolved"]);
export const LabelSetSchema = z.record(z.string(), z.string());
export const AnnotationSetSchema = z.record(z.string(), z.string());
export const UrlOrEmptyStringSchema = z.union([z.url(), z.literal("")]);
export const GrafanaSourceUrlSchema = z.union([z.url(), z.string().startsWith("?")]);

export const GrafanaAlertSchema = z.object({
  status: GrafanaAlertStatusSchema,
  labels: LabelSetSchema,
  annotations: AnnotationSetSchema,
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  generatorURL: GrafanaSourceUrlSchema,
  fingerprint: z.string(),
  silenceURL: z.url(),
  dashboardURL: UrlOrEmptyStringSchema,
  panelURL: UrlOrEmptyStringSchema,
  values: z.record(z.string(), z.number()).nullable(),
  valueString: z.string().optional(),
  orgId: z.number().int().nonnegative().optional(),
});

export const GrafanaWebhookSchema = z.object({
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

  // Optional extension fields for Grafana custom webhook payloads. Standard
  // Grafana alert webhooks do not always preserve the service label after
  // expression/reduce steps, so allow contact points to pass it explicitly.
  serviceName: z.string().min(1).optional(),
  service_name: z.string().min(1).optional(),
  service: z.string().min(1).optional(),
  investigation: z
    .object({
      serviceName: z.string().min(1).optional(),
      service_name: z.string().min(1).optional(),
      service: z.string().min(1).optional(),
    })
    .optional(),
});

export type GrafanaAlert = z.infer<typeof GrafanaAlertSchema>;
export type GrafanaWebhook = z.infer<typeof GrafanaWebhookSchema>;
