import "dotenv/config";
import Fastify from "fastify";
import { ZodError } from "zod";
import { GrafanaWebhookSchema } from "./grafanaWebhook";
import { enqueueAlertInvestigation } from "../jobs/alertInvestigationQueue";

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 8080);

app.post("/webhooks/grafana/alert", async (request, reply) => {
  request.log.info({ body: request.body }, "Received Grafana alert webhook");

  try {
    const payload = GrafanaWebhookSchema.parse(request.body);
    const job = await enqueueAlertInvestigation(payload);

    return reply.code(202).send({ ok: true, jobId: job.id });
  } catch (error) {
    if (error instanceof ZodError) {
      return reply.code(400).send({ ok: false, error: "Invalid Grafana webhook payload", issues: error.issues });
    }

    throw error;
  }
});

async function start() {
  try {
    await app.listen({ host: "0.0.0.0", port });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void start();
