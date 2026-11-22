import { useEffect, useState } from 'react'

/** Retarde la mise à jour d'une valeur (recherche côté client). */
export function useDebounce<T>(value: T, delay = 180): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
