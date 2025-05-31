// app.js
import routes from './src/application/handlers/route.js';
import * as client from 'prom-client';

// Configura métricas padrão do prom-client
client.collectDefaultMetrics({
  prefix: 'poc', // Prefixo para nomes de métricas
  labels: { env: 'local' }, // Rótulo genérico para identificar o ambiente
});

// Configura métricas personalizadas
// Counter para contar requisições HTTP totais
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'status', 'endpoint'],
});

// Histogram para medir duração de requisições
const requestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'endpoint'],
  buckets: [0.1, 0.3, 0.5, 1, 3, 5], // Buckets personalizados em segundos
});

// Summary para calcular percentis de duração de requisições
const requestDurationSummary = new client.Summary({
  name: 'http_request_duration_summary_seconds',
  help: 'Summary of HTTP request durations in seconds',
  labelNames: ['method', 'endpoint'],
  percentiles: [0.5, 0.9, 0.99], // Percentis personalizados
  maxAgeSeconds: 600, // Janela deslizante de 10 minutos
  ageBuckets: 5, // Número de buckets na janela
});

async function app(fastify, options) {
  // Registra as rotas existentes
  fastify.register(routes);

  // Endpoint para expor métricas ao Prometheus
  fastify.get('/metrics', async (request, reply) => {
    reply.header('Content-Type', client.register.contentType);
    reply.send(await client.register.metrics());
  });

  // Hook para medir métricas em todas as requisições
  fastify.addHook('onRequest', async (request, reply) => {
    // Inicia timers para medir duração da requisição (Histogram e Summary)
    request.histogramEnd = requestDuration.startTimer({
      method: request.method,
      endpoint: request.url,
    });
    request.summaryEnd = requestDurationSummary.startTimer({
      method: request.method,
      endpoint: request.url,
    });
  });

  fastify.addHook('onResponse', async (request, reply) => {
    // Incrementa contador de requisições com método, status e endpoint
    httpRequestsTotal.inc({
      method: request.method,
      status: reply.statusCode,
      endpoint: request.url,
    });

    // Finaliza timers para registrar duração da requisição
    request.histogramEnd();
    request.summaryEnd();
  });
}

export default app;