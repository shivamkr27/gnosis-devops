const client = require('prom-client');

function createMetrics(serviceName) {
  const registry = new client.Registry();

  client.collectDefaultMetrics({
    register: registry,
    prefix: `${serviceName}_`,
  });

  const httpRequestsTotal = new client.Counter({
    name: `${serviceName}_http_requests_total`,
    help: `Total HTTP requests handled by ${serviceName}`,
    labelNames: ['method', 'status'],
    registers: [registry],
  });

  const httpRequestDurationSeconds = new client.Histogram({
    name: `${serviceName}_http_request_duration_seconds`,
    help: `HTTP request duration in seconds for ${serviceName}`,
    labelNames: ['method', 'status'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [registry],
  });

  const metricsMiddleware = (req, res, next) => {
    const endTimer = httpRequestDurationSeconds.startTimer({ method: req.method });

    res.on('finish', () => {
      const status = String(res.statusCode);
      httpRequestsTotal.inc({ method: req.method, status });
      endTimer({ status });
    });

    next();
  };

  const metricsHandler = async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
  };

  return {
    metricsMiddleware,
    metricsHandler,
  };
}

module.exports = {
  createMetrics,
};
