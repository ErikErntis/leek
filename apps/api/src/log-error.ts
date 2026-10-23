export function logError(label: string, error: unknown) {
  const outer = error instanceof Error ? error : new Error('Unknown error');
  const cause = outer.cause instanceof Error ? outer.cause : outer;
  const code = 'code' in cause && typeof cause.code === 'string' ? cause.code : undefined;
  console.error(label, { name: cause.name, code, message: cause.message.split('\n')[0]?.slice(0, 500) });
}
