function getCompanyIdFromCookie(): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('companyId='))
  if (!match) return ''
  const value = decodeURIComponent(match.split('=').slice(1).join('=')).trim()
  return value || ''
}

export function getCompanyIdFromSearch(search: string): string {
  const params = new URLSearchParams(search)
  const companyId = params.get('companyId')?.trim()
  if (companyId) return companyId

  const companyIdsRaw = params.get('companyIds') || ''
  const companyIds = companyIdsRaw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  if (companyIds[0]) return companyIds[0]

  return getCompanyIdFromCookie()
}

export async function resolveCompanyId(search: string): Promise<string> {
  const fromSearch = getCompanyIdFromSearch(search)
  if (fromSearch) return fromSearch

  try {
    const activeCompanyResponse = await fetch('/api/auth/company', { cache: 'no-store' })
    if (activeCompanyResponse.ok) {
      const activeData = await activeCompanyResponse.json().catch(() => null)
      const activeCompanyId = activeData?.company?.id
      if (typeof activeCompanyId === 'string' && activeCompanyId.trim()) {
        return activeCompanyId.trim()
      }
    }

    const response = await fetch('/api/auth/me', { cache: 'no-store' })
    if (!response.ok) return ''

    const data = await response.json()
    return (
      data?.user?.companyId ||
      data?.company?.id ||
      ''
    )
  } catch {
    return ''
  }
}

export function stripCompanyParamsFromUrl(): void {
  if (typeof window === 'undefined') return

  const current = new URL(window.location.href)
  if (!current.searchParams.has('companyId') && !current.searchParams.has('companyIds')) return

  current.searchParams.delete('companyId')
  current.searchParams.delete('companyIds')

  const next = `${current.pathname}${current.searchParams.toString() ? `?${current.searchParams.toString()}` : ''}${current.hash}`
  window.history.replaceState({}, '', next)
}
