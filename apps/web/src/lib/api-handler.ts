import { type NextRequest, NextResponse } from 'next/server'

type RouteContext = { params?: Promise<Record<string, string>> }

type RouteHandler = (
  request: NextRequest,
  context: RouteContext
) => Promise<NextResponse>

/**
 * Wraps a Next.js route handler in a try/catch.
 * Unhandled errors produce { error: 'Internal server error' } with status 500.
 */
export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest, context: RouteContext) => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('[API Error]', request.nextUrl.pathname, error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}
