# Observability Agent

An alert investigation agent. When Grafana fires an alert, the agent gathers metrics, logs, traces and resource data for the affected service through the [`gcx`](https://grafana.com/docs/grafana-cloud/as-code/observability-as-code/grafana-cli/gcx/installation/) CLI, then asks an LLM to write an evidence-backed summary with a likely cause and next steps.

Built with TypeScript, Fastify, LangGraph / LangChain, OpenAI, BullMQ (Redis) and Zod. LangSmith tracing is optional.

## How it works

```
Grafana alert ──webhook──▶ API (Fastify) ──job──▶ Redis (BullMQ) ──▶ Worker ──▶ LangGraph workflow ──▶ summary
                           validate + 202                              │
                                                                       └─ gcx CLI ──▶ Grafana (Prometheus / Loki / Tempo)
```

1. **API** (`src/api/api.ts`): Grafana POSTs to `/webhooks/grafana/alert`. The body is validated with Zod (`src/api/grafanaWebhook.ts`); a bad payload gets a `400`. A valid one is enqueued and the API returns `202` immediately, because an investigation is far too slow to run inside the webhook request.
2. **Queue** (`src/jobs/alertInvestigationQueue.ts`): a BullMQ queue on Redis. It provides retries (3 attempts, exponential backoff), deduplication (the job ID is a hash of the group key, status, alert fingerprints and start time, so Grafana re-sending an alert doesn't start a second investigation) and result retention.
3. **Worker** (`src/workers/alertInvestigationWorker.ts`): picks up the job, infers the service name (from the payload's `service` / `service_name` / `job` / `app` ... labels or annotations), computes the time window (30 minutes before the alert started, up to now, or up to 5 minutes after it resolved), and runs the graph.
4. **Workflow** (`src/graph/`): a LangGraph pipeline that runs in a fixed order:

   | Step | What it does |
   |---|---|
   | `discover_datasources` | finds the Prometheus, Loki and Tempo datasource UIDs |
   | `confirm_data_availability` | checks scrape status (`up{job=...}`) and that log streams exist for the service |
   | `query_error_rates` | 5xx rate, error ratio, status-code breakdown |
   | `query_latency` | p95, average, and per-handler p95 latency |
   | `correlate_logs` | Loki queries for error lines, structured errors, error counts, and patterns like timeout / OOM / panic |
   | `correlate_traces` | Tempo searches for the service's traces, error traces, and traces slower than 1s |
   | `check_resources` | lists alert rules and dashboards for context |
   | `summarize_findings` | the one LLM call: turns the collected evidence into a summary |

   The steps and their queries are fixed in code (`src/graph/nodes/`); **the LLM does not choose which tools to call.** It only sees the evidence the earlier steps collected, and is instructed not to invent values or causes. Steps skip themselves if their datasource is missing.
5. **Tools** (`src/tools/gcx/`): LangChain tool wrappers that shell out to `gcx` (`execFile`, JSON output). Their argument schemas are Zod schemas.

The worker currently logs the result (summary, findings, tool calls) and stores it as the BullMQ job's return value. It does not yet send it anywhere, such as Slack or a ticket.

## Configuration

Copy these into `.env` (loaded with dotenv):

| Variable | Required | Notes |
|---|---|---|
| `GRAFANA_SERVER` | yes | Grafana URL |
| `SERVICE_TOKEN` or `GRAFANA_TOKEN` | yes | Grafana service account token |
| `OPENAI_API_KEY` | yes | used for the final summary |
| `ALERT_INVESTIGATION_MODEL` | no | default `gpt-5-mini` |
| `GRAFANA_ORG_ID` / `GRAFANA_STACK_ID` | no | self-hosted org / Grafana Cloud stack, if not auto-discovered |
| `GCX_CONTEXT` | no | gcx context name, default `default` |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`, `REDIS_DB` | no | default `127.0.0.1:6379` |
| `PORT` | no | API port, default 8080 |
| `ALERT_INVESTIGATION_ATTEMPTS`, `..._BACKOFF_MS`, `..._WORKER_CONCURRENCY`, `ALERT_INVESTIGATION_STEP` | no | queue and query tuning |
| `LANGSMITH_TRACING`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT` | no | LangSmith tracing |

## Running

### Docker

```bash
docker compose up --build
```

Starts Redis, the API (port 8080) and the worker. The image installs `gcx`, and the worker configures its Grafana context from your env vars on startup.

### Locally

Requires Node 20+, Redis and `gcx` on your `PATH`.

```bash
npm install
npm run setup:gcx      # configure and verify gcx against your Grafana
redis-server
npm run dev:api        # terminal 1 (port 8081)
npm run dev:worker     # terminal 2
```

### Smoke test

```bash
curl -i -X POST http://localhost:8080/webhooks/grafana/alert \
  -H 'content-type: application/json' \
  -d @docs/examples/grafana-alert-webhook.json
```

Expect `202 {"ok":true,"jobId":"..."}`, then the worker logs the investigation result. Point a Grafana contact point (webhook) at the same URL for real alerts.

## Known limits

- The PromQL, LogQL and TraceQL assume particular labels: `job="<service>"` for metrics and logs (`http_requests_total`, `http_request_duration_seconds_*`), and `resource.service.name` for traces.
  Services that don't expose those metrics or labels will get empty results for those steps.
- Results aren't delivered anywhere yet (see above).

More detail: [`docs/running-api-and-workflow.md`](docs/running-api-and-workflow.md), [`docs/testing-and-evaluation.md`](docs/testing-and-evaluation.md). The agent skill definitions the workflow was derived from live in `src/skills/` (see `debug-with-grafana`).
