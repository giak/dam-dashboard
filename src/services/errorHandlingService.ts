import { Subject, Observable } from "rxjs";

/**
 * Interface décrivant la structure des données d'erreur.
 * Cette interface est utilisée pour standardiser le format des erreurs dans l'application.
 */
export interface ErrorDataInterface {
  /** Message décrivant l'erreur */
  message: string;
  /** Code optionnel pour catégoriser l'erreur */
  code?: string;
  /** Horodatage de l'erreur */
  timestamp: number;
  /** Contexte dans lequel l'erreur s'est produite */
  context?: unknown;
}

/**
 * Service de gestion centralisée des erreurs.
 * Ce service permet d'émettre et d'observer les erreurs de manière globale dans l'application.
 */
class ErrorHandlingService {
  /** Subject privé pour gérer le flux d'erreurs */
  private errorSubject: Subject<ErrorDataInterface> = new Subject<ErrorDataInterface>();

  /**
   * Émet une nouvelle erreur dans le flux.
   * @param error - Les données de l'erreur à émettre
   * 
   * @example
   * // Émettre une erreur simple
   * errorHandlingService.emitError({
   *   message: "Une erreur s'est produite",
   *   timestamp: Date.now(),
   *   context: "ComponentX"
   * });
   * 
   * @example
   * // Émettre une erreur avec un code
   * errorHandlingService.emitError({
   *   message: "Échec de chargement des données",
   *   code: "DATA_LOAD_ERROR",
   *   timestamp: Date.now(),
   *   context: "DataService.loadData"
   * });
   */
  public emitError(error: ErrorDataInterface): void {
    this.errorSubject.next(error);
  }

  /**
   * Retourne un Observable permettant de s'abonner au flux d'erreurs.
   * @returns Un Observable émettant les erreurs
   * 
   * @example
   * // S'abonner aux erreurs dans un composant
   * import { errorHandlingService } from '@services/errorHandlingService';
   * 
   * export default {
   *   setup() {
   *     onMounted(() => {
   *       const subscription = errorHandlingService.getErrorObservable().subscribe(
   *         (error) => {
   *           console.error(`Erreur reçue: ${error.message} dans ${error.context}`);
   *           // Traiter l'erreur (par exemple, afficher une notification)
   *         }
   *       );
   * 
   *       onUnmounted(() => {
   *         subscription.unsubscribe();
   *       });
   *     });
   * 
   *     return {};
   *   }
   * };
   */
  public getErrorObservable(): Observable<ErrorDataInterface> {
    return this.errorSubject.asObservable();
  }
}

/** Instance unique exportée du service de gestion des erreurs */
export const errorHandlingService = new ErrorHandlingService();
