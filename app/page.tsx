import { redirect } from 'next/navigation'

export default function Home() {
  // Redirect to super admin for easy access during development
  redirect('/super-admin')
}
