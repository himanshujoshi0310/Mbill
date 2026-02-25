'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Set a simple cookie
    document.cookie = 'userId=dev-user; path=/; max-age=86400'
    
    // Redirect directly to main dashboard with a sample company ID
    router.push('/main/dashboard?companyId=jayeeep')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting to Dashboard...</h1>
        <p className="text-gray-600">Please wait...</p>
      </div>
    </div>
  )
}
