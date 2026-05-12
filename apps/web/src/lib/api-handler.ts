import { NextResponse } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRouteHandler = (request: any, context: any) => Promise<NextResponse>

/**
 * Wraps a Next.js route handler in a try/catch.
 * Unhandled errors produce { error: 'Internal server error' } with status 500.
 * Generic so that the wrapped handler preserves its original parameter types.
 */
export function withErrorHandler<H extends AnyRouteHandler>(handler: H): H {
  return (async (request: Request, context: unknown) => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('[API Error]', request.url, error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }) as H
}
