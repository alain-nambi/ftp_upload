import { createLogger, format, transports } from 'winston';
const { combine, timestamp, printf } = format;

// Define custom log format
const logFormat = printf(({ level, message, timestamp }) => {
    let datetime = new Date(timestamp).toLocaleString()
    datetime = datetime.replaceAll('/', '-')
    return `${datetime} [${level}]: ${message}`;
});

// Create logger instance
const logger = createLogger({
    level: 'info',
    format: combine(
        timestamp(),
        logFormat
    ),
    transports: [
        new transports.File({ filename: 'server.log' }),
        new transports.Console()
    ]
});

export default logger;
