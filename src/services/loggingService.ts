import { errorHandlingService, type ErrorDataInterface } from './errorHandlingService';

/**
 * Énumération des niveaux de log disponibles.
 */
enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Interface décrivant la structure d'une entrée de log.
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: string;
  data?: any;
}

/**
 * Service de journalisation centralisé pour l'application.
 * Ce service permet de consigner des logs de différents niveaux et de les afficher dans la console.
 * Il s'intègre également avec le service de gestion des erreurs pour consigner automatiquement les erreurs.
 */
class LoggingService {
  private logs: LogEntry[] = [];

  constructor() {
    this.subscribeToErrors();
  }

  /**
   * S'abonne au flux d'erreurs du service de gestion des erreurs pour les consigner automatiquement.
   */
  private subscribeToErrors() {
    errorHandlingService.getErrorObservable().subscribe((error: ErrorDataInterface | null) => {
      if (error) {
        this.error(error.message, error.context as string, { code: error.code });
      }
    });
  }

  /**
   * Consigne un message de niveau INFO.
   * 
   * @param message - Le message à consigner
   * @param context - Le contexte du log (ex: nom de la fonction ou du composant)
   * @param data - Données supplémentaires à inclure dans le log
   * 
   * @example
   * loggingService.info('Utilisateur connecté', 'AuthService', { userId: 123 });
   */
  public info(message: string, context?: string, data?: any) {
    this.log(LogLevel.INFO, message, context, data);
  }

  /**
   * Consigne un message de niveau WARN.
   * 
   * @param message - Le message à consigner
   * @param context - Le contexte du log (ex: nom de la fonction ou du composant)
   * @param data - Données supplémentaires à inclure dans le log
   * 
   * @example
   * loggingService.warn('Tentative de connexion échouée', 'AuthService', { userId: 123, attempts: 3 });
   */
  public warn(message: string, context?: string, data?: any) {
    this.log(LogLevel.WARN, message, context, data);
  }

  /**
   * Consigne un message de niveau ERROR.
   * 
   * @param message - Le message à consigner
   * @param context - Le contexte du log (ex: nom de la fonction ou du composant)
   * @param data - Données supplémentaires à inclure dans le log
   * 
   * @example
   * loggingService.error('Erreur lors de la récupération des données', 'DataService', { errorCode: 500 });
   */
  public error(message: string, context?: string, data?: any) {
    this.log(LogLevel.ERROR, message, context, data);
  }

  /**
   * Méthode interne pour consigner un log.
   */
  private log(level: LogLevel, message: string, context?: string, data?: any) {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
      data
    };

    this.logs.push(logEntry);
    this.printLog(logEntry);
  }

  /**
   * Affiche le log dans la console avec un formatage approprié.
   */
  private printLog(log: LogEntry) {
    const formattedMessage = `[${log.level}] ${log.timestamp} - ${log.context ? `[${log.context}] ` : ''}${log.message}`;
    switch (log.level) {
      case LogLevel.INFO:
        console.log(formattedMessage, log.data);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, log.data);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, log.data);
        break;
    }
  }

  /**
   * Récupère tous les logs enregistrés.
   * 
   * @returns Un tableau de toutes les entrées de log
   * 
   * @example
   * const allLogs = loggingService.getLogs();
   * console.table(allLogs);
   */
  public getLogs(): LogEntry[] {
    return this.logs;
  }
}

/**
 * Instance unique exportée du service de journalisation.
 */
export const loggingService = new LoggingService();
