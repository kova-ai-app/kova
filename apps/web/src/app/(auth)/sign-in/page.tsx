import React from 'react'
import { SignIn } from '@clerk/nextjs'

export default function SignInPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <SignIn />
    </main>
  )
}
