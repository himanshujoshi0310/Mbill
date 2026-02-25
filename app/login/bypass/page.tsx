import { redirect } from 'next/navigation'

export default function LoginBypassPage() {
  // Simple bypass for development - redirect to company selection
  redirect('/company/select')
}
