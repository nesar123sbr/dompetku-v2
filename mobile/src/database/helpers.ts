export function getNowIso() {
  return new Date().toISOString();
}

export function createLocalId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}