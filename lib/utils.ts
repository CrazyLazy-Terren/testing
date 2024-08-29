import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const memo = new Map()
export const deboundce = (fn: Function, key: string, time: number = 1000) => {
  if (memo.has(key)) {
    clearTimeout(memo.get(key))
  }
  memo.set(
    key,
    setTimeout(() => {
      fn()
      memo.delete(key)
    }, time)
  )
}
