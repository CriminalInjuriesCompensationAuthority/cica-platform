// Minimal example: import @cica/logger (installed from the local demo registry)
// and emit a structured log line, proving the package resolves and runs.
import { createLogger } from '@cica/logger';

// createLogger returns pino-http middleware; the pino logger hangs off `.logger`.
const middleware = createLogger();
const log = middleware.logger ?? middleware;

const installed = log.info.name ? '@cica/logger' : '@cica/logger';
log.info({ package: installed }, 'demo consumer imported @cica/logger from the local registry');
console.log('OK: @cica/logger resolved, imported, and logged.');
