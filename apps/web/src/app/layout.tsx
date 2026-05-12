import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from '@/components/providers'
import { Geist } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })

export const metadata: Metadata = {
  title: 'Kova — Revenue Intelligence',
  description: 'Revenue intelligence for drain & plumbing service teams',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body>
        <ClerkProvider>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
