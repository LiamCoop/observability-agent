# Running the API and LangGraph workflow

This project is a TypeScript Fastify API plus a LangGraph workflow that investigates Grafana alerts using the `gcx` CLI.

> Current repo note: the API validates Grafana alert webhooks, enqueues a BullMQ job in Redis, and returns `202`. A separate worker process consumes those jobs and invokes the LangGraph workflow. The `Dockerfile` is still a Python placeholder and should not be treated as the canonical way to run this TypeScript app yet.

## Prerequisites

- Node.js 20+
- `npm install`
- `gcx` installed and available on `PATH`
- `GRAFANA_SERVER` plus either `SERVICE_TOKEN` or `GRAFANA_TOKEN` in the environment / `.env`
- `OPENAI_API_KEY` in the environment / `.env` for the final LLM investigation summary
- Optional: `ALERT_INVESTIGATION_MODEL` to override the default model (`gpt-5-mini`)
- Optional: `GRAFANA_ORG_ID` for self-hosted Grafana, or `GRAFANA_STACK_ID` for Grafana Cloud if auto-discovery is unavailable
- Redis running locally or reachable via `REDIS_HOST` / `REDIS_PORT`
- Optional but recommended: LangSmith environment variables for tracing

```bash
export LANGSMITH_API_KEY=<your-langsmith-key>
export LANGSMITH_TRACING=true
export LANGSMITH_PROJECT=observability-agent-dev
export OPENAI_API_KEY=<your-openai-key>
# Optional; defaults to gpt-5-mini
export ALERT_INVESTIGATION_MODEL=gpt-5-mini
```

Configure and verify `gcx` before running the workflow:

```bash
npm run setup:gcx
```

This creates/updates the `GCX_CONTEXT` context, defaulting to `default`, maps `SERVICE_TOKEN` to gcx's `GRAFANA_TOKEN`, runs `gcx config check`, and lists datasources.

Manual verification:

```bash
gcx config current-context
gcx config view --minify
gcx datasources list -o json
```

## Run the API and worker locally

Start Redis, then run the API and worker in separate terminals:

```bash
redis-server
```

```bash
npm install
npm run dev:api
```

```bash
npm run dev:worker
```

The API listens on `0.0.0.0:8080` and exposes:

```text
POST /webhooks/grafana/alert
```

### Smoke test the webhook

```bash
curl -i -X POST http://localhost:8080/webhooks/grafana/alert \
  -H 'content-type: application/json' \
  -d @docs/examples/grafana-alert-webhook.json
```

Expected response:

```json
{ "ok": true, "jobId": "..." }
```

with HTTP status `202 Accepted`. The worker should then log job progress and the final investigation summary.

### Required service name

The worker must pass a service name into the LangGraph workflow. It resolves this from, in order:

1. custom webhook fields: `serviceName`, `service_name`, `service`, `investigation.serviceName`, `investigation.service_name`, or `investigation.service`
2. alert labels/common labels/group labels: `service`, `serviceName`, `service_name`, `service.name`, `job`, `app`, `application`, `container`, or `pod`
3. alert annotations/common annotations using the same keys

If your Grafana alert rule reduces away series labels, the default webhook may only contain labels such as `alertname` and `grafana_folder`. In that case, add a rule label/annotation like `service=checkout-api`, or set a custom webhook payload field:

```json
{
  "serviceName": "checkout-api",
  "receiver": "{{ .Receiver }}",
  "status": "{{ .Status }}",
  "alerts": {{ .Alerts | toJson }},
  "groupLabels": {{ .GroupLabels | toJson }},
  "commonLabels": {{ .CommonLabels | toJson }},
  "commonAnnotations": {{ .CommonAnnotations | toJson }},
  "externalURL": "{{ .ExternalURL }}",
  "version": "{{ .Version }}",
  "groupKey": "{{ .GroupKey }}",
  "truncatedAlerts": {{ .TruncatedAlerts }},
  "orgId": {{ .OrgID }},
  "title": "{{ .Title }}",
  "state": "{{ .State }}",
  "message": "{{ .Message }}"
}
```

## Run the LangGraph workflow directly

The graph entrypoint is `debugWithGrafanaGraph` from `src/graph/index.ts`. Invoke it with at least a `serviceName` and an optional time range:

```ts
import { debugWithGrafanaGraph } from "./src/graph";

const result = await debugWithGrafanaGraph.invoke({
  serviceName: "checkout-api",
  from: "now-1h",
  to: "now",
  step: "1m",
});

console.log(result.summary);
console.dir(result.findings, { depth: null });
```

A temporary runner can be created under `tmp/` and executed with:

```bash
npx tsx tmp/run-debug-workflow.ts
```

## What the workflow does

The current graph is a fixed sequence:

1. Discover Grafana datasources
2. Confirm data availability for the service
3. Query error rates
4. Query latency
5. Correlate logs
6. Correlate traces
7. Check Grafana resources
8. Summarize findings with OpenAI `gpt-5-mini` by default

The graph accumulates:

- `toolCalls`: every `gcx` tool invocation, output, or error
- `findings`: step-level diagnostic findings
- `summary`: final investigation summary

## Local development checklist

Before asking others to test:

- [ ] `gcx config current-context` points at the intended Grafana stack
- [ ] `gcx datasources list -o json` works
- [ ] API smoke test returns `202`
- [ ] Direct workflow invocation returns a summary
- [ ] LangSmith traces appear under `LANGSMITH_PROJECT`
- [ ] Test service names and alert fixtures are documented

## Known setup gaps to address next

- Add package scripts such as `run:workflow`, `typecheck`, and `test`.
- Add `tsconfig.json` and decide whether the repo should use ESM or CommonJS consistently.
- Persist or notify on workflow output instead of only returning/logging the BullMQ job result.
- Replace the Python placeholder `Dockerfile` with a Node.js image once runtime commands are finalized.
