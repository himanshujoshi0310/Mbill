'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function StockHistoryRedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const companyId = searchParams.get('companyId') || ''
    const productId = searchParams.get('productId') || ''
    const params = new URLSearchParams()
    if (companyId) params.set('companyId', companyId)
    if (productId) params.set('productId', productId)
    const query = params.toString()
    router.replace(query ? `/stock/dashboard?${query}` : '/stock/dashboard')
  }, [router, searchParams])

  return <div className="p-6 text-sm text-gray-500">Redirecting to stock preview...</div>
}
