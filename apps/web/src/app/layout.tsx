import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Providers } from '@/components/providers'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { cn } from '@/lib/utils'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
})

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
    <html lang="en" className={cn('font-sans', plusJakartaSans.variable)}>
      <body>
        <ClerkProvider>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
