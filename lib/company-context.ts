export function getCompanyIdFromSearch(search: string): string {
  const params = new URLSearchParams(search)
  const companyId = params.get('companyId')?.trim()
  if (companyId) return companyId

  const companyIdsRaw = params.get('companyIds') || ''
  const companyIds = companyIdsRaw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)

  return companyIds[0] || ''
}

export async function resolveCompanyId(search: string): Promise<string> {
  const fromSearch = getCompanyIdFromSearch(search)
  if (fromSearch) return fromSearch

  try {
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
