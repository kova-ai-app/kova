import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { Toaster } from '@/components/ui/sonner'
import { SidebarNav } from '@/components/sidebar-nav'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r bg-card flex flex-col">
        <div className="p-6">
          <Link href="/dashboard" className="block">
            <span className="text-xl font-bold tracking-tight">Kova</span>
          </Link>
        </div>
        <SidebarNav />
        <div className="p-4 border-t">
          <UserButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
      <Toaster />
    </div>
  )
}
