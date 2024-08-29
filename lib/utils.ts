import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
const memoize = new Map()

export const deboundce = (fn: () => void, id: string, time: number = 1000) => {
  if (memoize.has(id)) {
    clearTimeout(memoize.get(id))
  }
  memoize.set(
    id,
    setTimeout(() => {
      fn()
      memoize.delete(id)
    }, time)
  )
}
