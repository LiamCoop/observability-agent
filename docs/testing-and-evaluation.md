# Testing and evaluating the observability agent

The LangChain/LangGraph guidance we have access to is practical for this project. The most relevant points are:

- Use LangGraph tests around compiled graphs, not uncompiled builders.
- Design state so test assertions can inspect intermediate outputs (`toolCalls`, `findings`, `summary`).
- Use LangSmith tracing for every local/staging run.
- Add LangSmith evaluation datasets once we have representative alert scenarios.
- Track performance as an agent metric: latency, tool-call count, `gcx` errors, and final answer quality.

## Recommended test pyramid

### 1. API contract tests

Goal: confirm Grafana webhook payloads are accepted or rejected correctly.

Test cases:

- Valid firing alert returns `202`.
- Valid resolved alert returns `202`.
- Missing required fields returns `400`.
- Bad URL/date/value shapes return `400`.
- Multiple alerts in one webhook are accepted.

Use the fixture in `docs/examples/grafana-alert-webhook.json` as the first happy-path sample.

### 2. Tool wrapper tests

Goal: test `gcx` wrapper behavior without needing real Grafana.

Mock `child_process.execFile` and assert:

- `runGcx()` passes the expected args.
- JSON stdout is parsed.
- invalid JSON creates a useful error.
- non-zero exits include command, args, stdout, stderr, and exit code.

### 3. Graph integration tests with fake tools

Goal: verify graph flow and state updates deterministically.

Use fake tool outputs for datasource discovery, metrics, logs, traces, and resources. Assert:

- every expected node contributes a finding or tool call;
- `findings` and `toolCalls` append rather than overwrite;
- missing datasource data produces a graceful finding instead of crashing;
- final `summary` is present.

### 4. End-to-end staging tests

Goal: run the actual graph against a staging Grafana stack using a test `gcx` context.

Start with 3-5 known scenarios:

| Scenario | Expected behavior |
| --- | --- |
| Healthy service | Summary says no obvious incident evidence. |
| High 5xx rate | Error-rate finding cites Prometheus evidence. |
| High latency | Latency finding cites p95/p99 or histogram evidence. |
| Log spike | Logs finding cites representative errors. |
| Missing telemetry | Summary clearly identifies missing datasource/labels. |

## LangSmith setup

Set these for all local and CI-like evaluation runs:

```bash
export LANGSMITH_API_KEY=<your-key>
export LANGSMITH_TRACING=true
export LANGSMITH_PROJECT=observability-agent-dev
```

Use trace metadata/tags where possible:

- `environment`: `local`, `staging`, `ci`
- `serviceName`
- `alertname`
- `scenario`
- `gcx_context`

## Evaluation dimensions

For each alert scenario, evaluate both correctness and operational performance.

### Quality metrics

- **Actionability**: Does the summary identify what to check next?
- **Evidence quality**: Are findings backed by metrics/logs/traces/resources?
- **No hallucinated telemetry**: Does it avoid inventing services, labels, or datasource names?
- **Graceful degradation**: Does it explain missing data instead of failing silently?
- **Incident relevance**: Does it focus on the alerted service and time window?

### Performance metrics

Capture these from graph outputs, logs, and LangSmith traces:

- end-to-end runtime
- per-node runtime
- number of `gcx` tool calls
- `gcx` error count
- timeout count
- final state size / trace size
- model token usage and cost, once LLM calls are added

Initial targets can be loose, for example:

- p50 workflow runtime under 30s for simple alerts
- p95 workflow runtime under 90s for normal staging alerts
- zero unhandled graph exceptions
- all tool failures represented in `toolCalls` and summarized in `findings`

## Evaluation dataset plan

Create a small versioned dataset of alert inputs and expected outcomes:

```text
evals/
  alerts/
    high-error-rate.json
    high-latency.json
    missing-logs.json
  expected/
    high-error-rate.md
    high-latency.md
    missing-logs.md
```

For each case, record:

- input webhook or graph state
- target service and time window
- expected datasource types used
- expected findings
- unacceptable claims
- expected performance envelope

Once this is stable, mirror the cases into LangSmith datasets and run evaluators against new graph versions.

## Practical next steps

1. Add package scripts for API, direct workflow runs, typecheck, and tests.
2. Add fixtures for at least one alert per target scenario.
3. Add mocked tests around `runGcx()` and the graph state reducers.
4. Enable LangSmith tracing locally and confirm traces show the graph steps.
5. Run the first staging evaluation batch and save the traces as the baseline.
