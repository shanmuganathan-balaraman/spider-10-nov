"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogLevel = void 0;
exports.createLogger = createLogger;
var config_1 = require("../config");
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
var logLevelMap = {
    debug: LogLevel.DEBUG,
    info: LogLevel.INFO,
    warn: LogLevel.WARN,
    error: LogLevel.ERROR,
};
/**
 * Create a logger instance for a specific module
 */
function createLogger(module) {
    var level = logLevelMap[config_1.config.logLevel] || LogLevel.INFO;
    var shouldLog = function (logLevel) {
        var levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
        var currentLevelIndex = levels.indexOf(level);
        var messageLevelIndex = levels.indexOf(logLevel);
        return messageLevelIndex >= currentLevelIndex;
    };
    var formatMessage = function (logLevel, message) {
        var timestamp = new Date().toISOString();
        return "[".concat(timestamp, "] [").concat(logLevel, "] [").concat(module, "] ").concat(message);
    };
    return {
        debug: function (message) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (shouldLog(LogLevel.DEBUG)) {
                console.log.apply(console, __spreadArray([formatMessage(LogLevel.DEBUG, message)], args, false));
            }
        },
        info: function (message) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (shouldLog(LogLevel.INFO)) {
                console.log.apply(console, __spreadArray([formatMessage(LogLevel.INFO, message)], args, false));
            }
        },
        warn: function (message) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (shouldLog(LogLevel.WARN)) {
                console.warn.apply(console, __spreadArray([formatMessage(LogLevel.WARN, message)], args, false));
            }
        },
        error: function (message) {
            var args = [];
            for (var _i = 1; _i < arguments.length; _i++) {
                args[_i - 1] = arguments[_i];
            }
            if (shouldLog(LogLevel.ERROR)) {
                console.error.apply(console, __spreadArray([formatMessage(LogLevel.ERROR, message)], args, false));
            }
        },
    };
}
