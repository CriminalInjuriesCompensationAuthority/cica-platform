# @cica/logger

Shared [pino](https://github.com/pinojs/pino) / [pino-http](https://github.com/pinojs/pino-http)
logger factory for CICA Node.js services. Generalised from the reference implementation in
`cica-review-case-documents`, so every service gets the same structured logging, env-driven
redaction, correlation id, and dev pretty-printing without copy-pasting middleware.

Managed by [`project-baseline`](https://github.com/CriminalInjuriesCompensationAuthority/project-baseline)
(profile: `node-library`).

## Install

Consumed via a GitHub semver ref (not the npm registry):

```jsonc
"@cica/logger": "github:CriminalInjuriesCompensationAuthority/cica-platform#semver:logger-v0.1.0"
```

`pino-pretty` is an optional peer dependency — install it in the consumer only if you want the dev
pretty transport (it is not needed in production).

## Usage

```js
import { createLogger } from '@cica/logger';

const logger = createLogger();
app.use(logger); // pino-http request logger

// The underlying pino instance is available for app logging:
logger.logger.info('started');
```

## API

| Export | Description |
| --- | --- |
| `createLogger(options)` | Returns a configured `pino-http` middleware (default export too). |
| `buildRedactConfig(options)` | Builds a pino `redact` config; exported for reuse/testing. |
| `DEFAULT_REDACT_PATHS` | The frozen default redaction path list. |
| `resolveLogLevel(req, res, err)` | 5xx/err → error, 4xx → warn, else info. |
| `resolveCorrelationId(req, generate?)` | Correlation id from headers / `req.id` / generator. |
| `parseCsvEnv(value)` | Parses a comma-separated env var into a string array. |

### `createLogger(options)`

All options are optional. Explicit options win over environment variables, which win over defaults.

| Option | Env fallback | Default |
| --- | --- | --- |
| `level` | `APP_LOG_LEVEL` | `info` (prod) / `debug` |
| `pretty` | — | on when not production and no `stream` |
| `prettyJson` | `APP_LOG_PRETTY_JSON` | `false` |
| `redactDisabled` | `APP_LOG_REDACT_DISABLE` | `false` |
| `redactExtraPaths` | `APP_LOG_REDACT_EXTRA` (csv) | `[]` |
| `redactBasePaths` | — | `DEFAULT_REDACT_PATHS` |
| `redactCensor` | — | `[REDACTED]` |
| `nodeEnv` | `NODE_ENV` | — |
| `stream` | — | — (pino default stdout) |
| `genId` | — | time+random generator |
| `pinoOptions` | — | `{}` (spread into pino) |
| `env` | — | `process.env` (injectable for tests) |

### Redaction

By default the logger redacts common secret-bearing fields (auth/cookie/api-key headers, OAuth query
params, credential body fields, set-cookie). Add more via `redactExtraPaths` or `APP_LOG_REDACT_EXTRA`
(comma-separated). Disable only with care.

## Development

```bash
npm install
npm test          # c8 node --test
npm run lint      # biome check
```

## License

MIT
