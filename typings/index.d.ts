declare const wx: {
  getSystemInfoSync(): { windowHeight: number; windowWidth: number }
  vibrateShort(options?: { type?: 'heavy' | 'medium' | 'light'; success?: () => void; fail?: () => void; complete?: () => void }): void
  setClipboardData(options: { data: string; success?: () => void; fail?: () => void; complete?: () => void }): void
  createSelectorQuery(): {
    select(selector: string): {
      boundingClientRect(callback: (rect: Rect | null) => void): { exec(): void }
    }
    selectAll(selector: string): {
      boundingClientRect(callback: (rects: Rect[]) => void): { exec(): void }
    }
  }
}

declare function App(options: Record<string, unknown>): void
declare function Page<T extends Record<string, unknown>>(
  options: T &
    ThisType<
      T & {
        data: Record<string, unknown>
        setData(data: Record<string, unknown>, callback?: () => void): void
      }
    >,
): void

type Rect = {
  id?: string
  left: number
  right: number
  top: number
  bottom: number
  width: number
  height: number
}
