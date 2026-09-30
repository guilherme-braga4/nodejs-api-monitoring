# Node.js API Monitoring

Proof of concept of API observability with open-source tools: a **Fastify** API instrumented with **prom-client**, scraped by **Prometheus** and visualized in **Grafana**. Docker Compose defines the three services.

## How it works

```
Client -> Fastify API  <- scrapes /metrics -  Prometheus  <- queries -  Grafana
```

1. Fastify hooks (`onRequest` and `onResponse`) time and count the requests.
2. The API exposes the metrics in the Prometheus text format at `GET /metrics`.
3. Prometheus scrapes `app:3000` every 5 seconds.
4. Grafana reads from Prometheus to build dashboards.

## Stack

- Node.js, Fastify 5, fastify-cli
- prom-client 15
- Prometheus and Grafana
- Docker and Docker Compose

## Metrics

| Metric | Type | Labels | Notes |
|---|---|---|---|
| `http_requests_total` | Counter | `method`, `status`, `endpoint` | Total number of HTTP requests |
| `http_request_duration_seconds` | Histogram | `method`, `endpoint` | Buckets: 0.1, 0.3, 0.5, 1, 3 and 5 seconds |
| `http_request_duration_summary_seconds` | Summary | `method`, `endpoint` | p50, p90 and p99 over a 10-minute sliding window |

The default Node.js process metrics from prom-client (CPU, memory, event loop, garbage collection) are also collected, with the prefix `poc` and the label `env="local"`.

## Running

Requirements: Docker and Docker Compose.

```bash
git clone https://github.com/guilherme-braga4/nodejs-api-monitoring.git
cd nodejs-api-monitoring
docker compose up --build
```

| Service | URL |
|---|---|
| API | http://localhost:3000 |
| Metrics | http://localhost:3000/metrics |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3030 |

Generate some traffic so there is something to see:

```bash
for i in $(seq 1 50); do curl -s http://localhost:3000/ > /dev/null; done
```

### Queries to try in Prometheus

Requests per second:

```promql
rate(http_requests_total[1m])
```

90th percentile of the request duration:

```promql
histogram_quantile(0.9, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

### Grafana

Open http://localhost:3030 and sign in with Grafana's default user. Add a Prometheus data source pointing to `http://prometheus:9090` (the same definition is in `grafana.yml`) and build panels with the queries above.

## Project structure

```
app.js                              Fastify plugin: metrics, hooks and the /metrics route
server.js                           Standalone entry point (node server.js)
src/application/handlers/route.js   API routes
Dockerfile                          API image
docker-compose.yaml                 API + Prometheus + Grafana
prometheus.yml                      Scrape configuration
grafana.yml                         Prometheus data source definition
```

## Next steps

- Use the route pattern instead of the raw URL in the `endpoint` label, to keep label cardinality low.
- Provision the Grafana data source and a dashboard automatically, by mounting `grafana.yml` in Grafana's provisioning folder.
- Add automated tests.
