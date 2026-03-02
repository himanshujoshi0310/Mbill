export function isAbortError(error: unknown): boolean {
  if (!error) return false

  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }

  if (error instanceof Error) {
    if (error.name === 'AbortError') return true
    const message = error.message.toLowerCase()
    if (message.includes('aborted') || message.includes('aborterror')) {
      return true
    }
  }

  const candidate = error as { name?: unknown; code?: unknown; message?: unknown }
  if (candidate?.name === 'AbortError' || candidate?.code === 'ABORT_ERR') {
    return true
  }

  return false
}
