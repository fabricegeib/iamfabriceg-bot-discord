const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

// Lit directement process.env pour rester importable sans validation .env.
let currentLevel = LEVELS[process.env.LOG_LEVEL] || LEVELS.info;

function setLevel(level) {
  if (LEVELS[level] !== undefined) currentLevel = LEVELS[level];
}

function emit(level, scope, message, meta) {
  if (LEVELS[level] < currentLevel) return;

  const prefix = scope ? `[${scope}] ` : "";
  const line = `${new Date().toISOString()} ${level.toUpperCase().padEnd(5)} ${prefix}${message}`;

  if (meta === undefined) {
    console.log(line);
  } else if (level === "error") {
    console.error(line, meta);
  } else if (level === "warn") {
    console.warn(line, meta);
  } else {
    console.log(line, meta);
  }
}

/** Crée un logger préfixé pour un module donné. */
function createLogger(scope) {
  return {
    debug: (message, meta) => emit("debug", scope, message, meta),
    info: (message, meta) => emit("info", scope, message, meta),
    warn: (message, meta) => emit("warn", scope, message, meta),
    error: (message, meta) => emit("error", scope, message, meta),
  };
}

module.exports = { createLogger, setLevel, emit, LEVELS };
