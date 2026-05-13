declare module 'react-test-renderer' {
  import type * as React from 'react'

  export interface ReactTestRenderer {
    root: {
      findByProps(props: Record<string, unknown>): any
      findAllByType(type: string): any[]
    }
    unmount(): void
  }

  export function create(element: React.ReactElement): ReactTestRenderer
  export function act(callback: () => void | Promise<void>): Promise<void>

  const TestRenderer: {
    create: typeof create
  }

  export default TestRenderer
}
