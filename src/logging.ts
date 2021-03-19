import winston, { format, transports } from 'winston';

/* https://tools.ietf.org/html/rfc5424#section-6.2.1
 * Code         Severity
 * 0 / emerg    Emergency: system is unusable
 * 1 / alert    Alert: action must be taken immediately
 * 2 / crit     Critical: critical conditions
 * 3 / error    Error: error conditions
 * 4 / warning  Warning: warning conditions
 * 5 / notice   Notice: normal but significant condition
 * 6 / info     Informational: informational messages
 * 7 / debug    Debug: debug-level messages
 */

export const log = winston.createLogger({
  levels: winston.config.syslog.levels,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.sssZ' }),
    process.env.DEV_MODE
      ? format.cli({ colors: { info: 'blue', error: 'red' } })
      : format.json()
  ),
  transports: [new transports.Console()],
});
