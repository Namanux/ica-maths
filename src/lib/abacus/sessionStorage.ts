const STORAGE_KEY = "abacus_session_config";

export type SessionConfig = {
  timeLimitSeconds: number; // default 15
};

const DEFAULT_CONFIG: SessionConfig = { timeLimitSeconds: 15 };

export function getSessionConfig(): SessionConfig {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveSessionConfig(config: SessionConfig): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // localStorage unavailable — ignore.
  }
}

export function updateTimeLimitFromPerformance(avgResponseTimeMs: number): void {
  const config = getSessionConfig();
  let timeLimitSeconds = config.timeLimitSeconds;
  if (avgResponseTimeMs < 4000) {
    timeLimitSeconds = 12;
  } else if (avgResponseTimeMs > 10000) {
    timeLimitSeconds = 15;
  }
  saveSessionConfig({ timeLimitSeconds });
}
