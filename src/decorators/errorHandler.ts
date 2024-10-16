import { errorHandlingService, type ErrorDataInterface } from "@services/errorHandlingService";

export function errorHandler() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      try {
        const result = originalMethod.apply(this, args);

        // Si la méthode retourne une Promise, on gère les erreurs de manière asynchrone
        if (result && result instanceof Promise) {
          return result.catch((error: Error) => {
            handleError(error, propertyKey);
            throw error; // On relance l'erreur pour permettre une gestion supplémentaire si nécessaire
          });
        }

        return result;
      } catch (error) {
        handleError(error as Error, propertyKey);
        throw error; // On relance l'erreur pour permettre une gestion supplémentaire si nécessaire
      }
    };

    return descriptor;
  };
}

function handleError(error: Error, context: string): void {
  const errorData: ErrorDataInterface = {
    message: error.message,
    code: error.name,
    timestamp: Date.now(),
    context: context,
  };

  errorHandlingService.emitError(errorData);
}
