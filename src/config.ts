import * as fs from 'fs';
import type { ToolSourceConfig } from 'code-mode-core';

export type { ToolSourceConfig };

export interface ServerConfig {
  toolSources: ToolSourceConfig[];
  timeout: number;
  memoryLimit: number;
  enableTrace: boolean;
}

const DEFAULTS = {
  timeout: 30000,
  memoryLimit: 128,
  enableTrace: false,
} as const;

/**
 * Load and validate config from a JSON file.
 */
export function loadConfig(filePath: string): ServerConfig {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Config file not found: ${filePath} (${msg})`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse JSON in config file: ${filePath}`);
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>).toolSources)
  ) {
    throw new Error(
      'Config must have a "toolSources" array field',
    );
  }

  const obj = parsed as Record<string, unknown>;
  return {
    toolSources: obj.toolSources as ToolSourceConfig[],
    timeout: typeof obj.timeout === 'number' ? obj.timeout : DEFAULTS.timeout,
    memoryLimit:
      typeof obj.memoryLimit === 'number'
        ? obj.memoryLimit
        : DEFAULTS.memoryLimit,
    enableTrace:
      typeof obj.enableTrace === 'boolean'
        ? obj.enableTrace
        : DEFAULTS.enableTrace,
  };
}

/**
 * Parse CLI arguments and load config. Returns merged ServerConfig.
 * Manual arg parsing — zero deps for v0.1.
 */
export function parseArgs(argv: string[]): ServerConfig {
  let configPath: string | undefined;
  let timeoutOverride: number | undefined;
  let memoryLimitOverride: number | undefined;
  let traceOverride = false;

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--config':
        configPath = argv[++i];
        break;
      case '--timeout':
        timeoutOverride = parseInt(argv[++i], 10);
        break;
      case '--memory-limit':
        memoryLimitOverride = parseInt(argv[++i], 10);
        break;
      case '--trace':
        traceOverride = true;
        break;
    }
  }

  if (!configPath) {
    throw new Error('Missing required --config <path> argument');
  }

  const config = loadConfig(configPath);

  if (timeoutOverride !== undefined && !isNaN(timeoutOverride)) {
    config.timeout = timeoutOverride;
  }
  if (memoryLimitOverride !== undefined && !isNaN(memoryLimitOverride)) {
    config.memoryLimit = memoryLimitOverride;
  }
  if (traceOverride) {
    config.enableTrace = true;
  }

  return config;
}
