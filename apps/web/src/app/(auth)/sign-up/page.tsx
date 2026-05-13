import React from 'react'
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage(): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <SignUp />
    </main>
  )
}
