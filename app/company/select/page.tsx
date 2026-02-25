import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CompanySelectorSimple from './CompanySelectorSimple'
import LogoutButton from '@/components/LogoutButton'

export default async function CompanySelectPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  // For now, return hardcoded companies since we don't have database users yet
  const companies = [
    { id: 'cmm21mvo60007t2q8axbyihwi', name: 'KR Enterprises' },
    { id: 'demo', name: 'Demo Company' }
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select Company</CardTitle>
          <p className="text-sm text-gray-600">Welcome back, {session.name || session.userId}! Select your company to continue.</p>
        </CardHeader>
        <CardContent>
          <CompanySelectorSimple companies={companies} />
        </CardContent>
      </Card>
    </div>
  )
}