import { errorHandlingService, type ErrorDataInterface } from "@services/errorHandlingService";
import { throwError } from 'rxjs';

/**
 * withErrorHandling est une fonction d'ordre supérieur qui enveloppe une fonction donnée
 * avec une gestion d'erreur centralisée. Elle capture les erreurs synchrones et asynchrones,
 * les traite via le service de gestion des erreurs, puis les relance.
 *
 * @template T - Le type de la fonction à envelopper
 * @param {T} fn - La fonction à envelopper avec la gestion d'erreur
 * @param {string} context - Une chaîne décrivant le contexte de l'erreur (par exemple, le nom de la fonction ou du module)
 * @returns {(...args: Parameters<T>) => ReturnType<T>} Une nouvelle fonction avec la même signature que fn, mais avec gestion d'erreur intégrée
 *
 * @example
 * // Fonction synchrone
 * const riskyFunction = (x: number, y: number): number => {
 *   if (y === 0) throw new Error("Division par zéro");
 *   return x / y;
 * };
 * const safeDivide = withErrorHandling(riskyFunction, "safeDivide");
 * 
 * try {
 *   safeDivide(10, 0); // Ceci va émettre une erreur via errorHandlingService
 * } catch (error) {
 *   console.log("Erreur capturée:", error.message);
 * }
 *
 * @example
 * // Fonction asynchrone
 * const fetchData = async (url: string): Promise<Response> => {
 *   const response = await fetch(url);
 *   if (!response.ok) throw new Error("Erreur réseau");
 *   return response;
 * };
 * const safeFetch = withErrorHandling(fetchData, "safeFetch");
 * 
 * safeFetch("https://api.example.com/data")
 *   .then(response => console.log("Données reçues:", response))
 *   .catch(error => console.log("Erreur capturée:", error.message));
 */
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  context: string
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          handleError(error, context);
          throw error;
        }) as ReturnType<T>;
      }
      return result;
    } catch (error) {
      handleError(error as Error, context);
      throw error;
    }
  };
}

/**
 * handleError est une fonction interne qui traite les erreurs capturées
 * en les formatant et en les émettant via le service de gestion des erreurs.
 *
 * @param {Error} error - L'erreur capturée
 * @param {string} context - Le contexte dans lequel l'erreur s'est produite
 */
function handleError(error: Error, context: string): void {
  const errorData: ErrorDataInterface = {
    message: error.message,
    code: error.name,
    timestamp: Date.now(),
    context: context,
  };

  errorHandlingService.emitError(errorData);
}

/**
 * handleObservableError est une fonction interne qui traite les erreurs capturées
 * en les formatant et en les émettant via le service de gestion des erreurs.
 *
 * @param {unknown} err - L'erreur capturée
 * @param {string} code - Le code de l'erreur
 * @param {string} context - Le contexte dans lequel l'erreur s'est produite
 */
export function handleObservableError(err: unknown, code: string, context: string) {
  errorHandlingService.emitError({
    message: `Erreur: ${err instanceof Error ? err.message : String(err)}`,
    code,
    timestamp: Date.now(),
    context
  });
  return throwError(() => err);
}
