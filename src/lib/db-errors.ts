const UNIQUE_VIOLATION = "23505"

// Single queries wrap the database error as `cause`. Batches throw it directly.
export function isUniqueViolation(error: unknown) {
  const candidates = [error, error instanceof Error ? error.cause : undefined]
  return candidates.some((candidate) => (candidate as { code?: string } | undefined)?.code === UNIQUE_VIOLATION)
}
