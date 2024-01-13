import { createLogger, format, transports } from 'winston'

const logger = createLogger({
  level: 'debug',
  format: format.combine(format.timestamp(), format.json()),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new transports.File({ filename: 'error.log', level: 'error' }),
    new transports.File({ filename: 'info.log', level: 'info' }),
    new transports.File({ filename: 'combined.log' }),
    new transports.Console({
      format: format.combine(format.colorize({ all: true }), format.simple()),
    }),
  ],
})

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
// if (process.env.NODE_ENV !== 'production') {

  // Log to the console
// 

export default logger
