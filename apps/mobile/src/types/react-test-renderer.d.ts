declare module 'react-test-renderer' {
  import type * as React from 'react'

  export interface ReactTestInstance {
    props: Record<string, unknown>
    findByProps(props: Record<string, unknown>): ReactTestInstance
    findAllByProps(props: Record<string, unknown>): ReactTestInstance[]
    findAllByType(type: string): ReactTestInstance[]
  }

  export interface ReactTestRenderer {
    root: ReactTestInstance
    update(element: React.ReactElement): void
    unmount(): void
  }

  export function create(element: React.ReactElement): ReactTestRenderer
  export function act(callback: () => void): void
  export function act(callback: () => Promise<void>): Promise<void>

  const TestRenderer: {
    create: typeof create
  }

  export default TestRenderer
}
