/**
 * Fonction de mémoïsation pour optimiser les calculs coûteux.
 * @param fn - La fonction à mémoïser
 * @returns Une version mémoïsée de la fonction
 */
export function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map();
  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}
