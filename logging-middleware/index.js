/**
 * Affordmed Custom Logging Middleware
 * 
 * A custom logger that replaces console.log / built-in loggers.
 * Supports log levels: DEBUG, INFO, WARN, ERROR, FATAL
 * Outputs structured JSON logs with timestamp, level, message, and metadata.
 * Can be used as Express middleware or standalone logger.
 * 
 * @module affordmed-logger
 */

const fs = require('fs');
const path = require('path');

// ─── Log Levels ──────────────────────────────────────────────
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4,
};

const LEVEL_COLORS = {
  DEBUG: '\x1b[36m',   // Cyan
  INFO: '\x1b[32m',    // Green
  WARN: '\x1b[33m',    // Yellow
  ERROR: '\x1b[31m',   // Red
  FATAL: '\x1b[35m',   // Magenta
};

const RESET_COLOR = '\x1b[0m';

// ─── Logger Class ────────────────────────────────────────────
class Logger {
  /**
   * @param {Object} options
   * @param {string} [options.level='DEBUG'] - Minimum log level
   * @param {string} [options.serviceName='app'] - Name of the service
   * @param {boolean} [options.enableFile=false] - Write logs to file
   * @param {string} [options.logDir='./logs'] - Directory for log files
   * @param {boolean} [options.enableColors=true] - Colorized console output
   * @param {boolean} [options.enableConsole=true] - Print to console
   */
  constructor(options = {}) {
    this.level = options.level || 'DEBUG';
    this.serviceName = options.serviceName || 'app';
    this.enableFile = options.enableFile || false;
    this.logDir = options.logDir || './logs';
    this.enableColors = options.enableColors !== undefined ? options.enableColors : true;
    this.enableConsole = options.enableConsole !== undefined ? options.enableConsole : true;

    if (this.enableFile) {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    }
  }

  /**
   * Format a log entry as structured JSON
   */
  _formatEntry(level, message, meta = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...meta,
    };
  }

  /**
   * Determine if a message at the given level should be logged
   */
  _shouldLog(level) {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  /**
   * Write the log entry to configured outputs
   */
  _write(level, message, meta) {
    if (!this._shouldLog(level)) return;

    const entry = this._formatEntry(level, message, meta);
    const jsonStr = JSON.stringify(entry);

    // Console output
    if (this.enableConsole) {
      if (this.enableColors) {
        const color = LEVEL_COLORS[level] || '';
        process.stdout.write(
          `${color}[${entry.timestamp}] [${level}] [${this.serviceName}]${RESET_COLOR} ${message}\n`
        );
        if (Object.keys(meta).length > 0) {
          process.stdout.write(`  ${JSON.stringify(meta)}\n`);
        }
      } else {
        process.stdout.write(jsonStr + '\n');
      }
    }

    // File output
    if (this.enableFile) {
      const date = new Date().toISOString().split('T')[0];
      const filePath = path.join(this.logDir, `${date}.log`);
      fs.appendFileSync(filePath, jsonStr + '\n');
    }

    return entry;
  }

  debug(message, meta = {}) {
    return this._write('DEBUG', message, meta);
  }

  info(message, meta = {}) {
    return this._write('INFO', message, meta);
  }

  warn(message, meta = {}) {
    return this._write('WARN', message, meta);
  }

  error(message, meta = {}) {
    return this._write('ERROR', message, meta);
  }

  fatal(message, meta = {}) {
    return this._write('FATAL', message, meta);
  }

  /**
   * Express middleware that logs every incoming HTTP request and its response.
   * Replaces morgan / built-in console logging.
   */
  expressMiddleware() {
    const logger = this;
    return function loggingMiddleware(req, res, next) {
      const start = Date.now();
      const requestId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Log incoming request
      logger.info(`→ ${req.method} ${req.originalUrl}`, {
        requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('User-Agent'),
      });

      // Capture response
      const originalEnd = res.end;
      res.end = function (...args) {
        const duration = Date.now() - start;
        const level = res.statusCode >= 500 ? 'ERROR'
          : res.statusCode >= 400 ? 'WARN'
          : 'INFO';

        logger._write(level, `← ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`, {
          requestId,
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          durationMs: duration,
        });

        originalEnd.apply(res, args);
      };

      next();
    };
  }
}

// ─── Default Instance ────────────────────────────────────────
const defaultLogger = new Logger({
  level: 'DEBUG',
  serviceName: 'affordmed-notification',
  enableFile: true,
  logDir: './logs',
});

module.exports = { Logger, logger: defaultLogger };
