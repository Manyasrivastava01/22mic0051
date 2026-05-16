# Affordmed Custom Logging Middleware

A custom logging middleware built for the Campus Notification Platform evaluation. This replaces built-in language loggers (e.g. `console.log`) with a structured, configurable logging solution.

## Features

- **Structured JSON Logs** — Every log entry is a JSON object with `timestamp`, `level`, `service`, `message`, and optional metadata.
- **5 Log Levels** — `DEBUG`, `INFO`, `WARN`, `ERROR`, `FATAL` with level-based filtering.
- **Colorized Console Output** — Color-coded output for easy readability in development.
- **File Logging** — Automatic daily log file rotation in a configurable directory.
- **Express Middleware** — Drop-in HTTP request/response logging for Express apps.
- **Zero Dependencies** — Uses only Node.js built-in modules.

## Usage

### Standalone Logger

```js
const { logger } = require('./logging-middleware');

logger.info('Server started', { port: 3000 });
logger.debug('Fetching notifications', { studentId: 1042 });
logger.error('Failed to connect to DB', { error: err.message });
```

### Express Middleware

```js
const express = require('express');
const { Logger } = require('./logging-middleware');

const app = express();
const log = new Logger({ serviceName: 'api-server', enableFile: true });

app.use(log.expressMiddleware());
```

### Custom Configuration

```js
const { Logger } = require('./logging-middleware');

const logger = new Logger({
  level: 'WARN',            // Only WARN, ERROR, FATAL will be logged
  serviceName: 'worker',
  enableFile: true,
  logDir: './logs',
  enableColors: false,       // Disable colors for CI/CD
});
```

## Log Output Example

```json
{
  "timestamp": "2026-05-16T10:00:00.000Z",
  "level": "INFO",
  "service": "affordmed-notification",
  "message": "→ GET /api/notifications",
  "requestId": "1716033600000-a1b2c3",
  "method": "GET",
  "url": "/api/notifications"
}
```
