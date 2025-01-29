import log4js, { addLayout } from 'log4js';
import path from 'path';

function configureLogging() {
    log4js.configure({
        appenders: {
            stdout: {
                type: 'stdout',
                layout: {
                    type: 'pattern',
                    pattern: '%d [%p] %c - %m'
                }
            },
        },
        categories: {
            default: {
                appenders: ['stdout'],
                level: process.env['LOG_LEVEL'] || 'info',
            },
        },
    });
}

function getLogger(filename: string): log4js.Logger {
    const srcDir = path.dirname(__filename) + '/';
    const loggerName = filename.startsWith(srcDir)
        ? filename.substring(srcDir.length)
        : filename;

    return log4js.getLogger(loggerName);
}

export { 
    configureLogging, 
    getLogger 
};