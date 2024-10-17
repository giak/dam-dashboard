import { Observable, combineLatest, of } from 'rxjs';
import { map, startWith, catchError } from 'rxjs/operators';
import { errorHandlingService } from '@services/errorHandlingService';
import { loggingService } from '@services/loggingService';
import { withErrorHandling } from '@utils/errorHandlerUtil';

export interface InflowSourceInterface {
  name: string;
  outflowRate$: Observable<number>;
}

export interface AggregatedInflowInterface {
  totalInflow: number;
  sources: { [key: string]: number };
}

export function createInflowAggregator(sources: InflowSourceInterface[]): Observable<AggregatedInflowInterface> {
  const sourceObservables = sources.map(source => 
    source.outflowRate$.pipe(
      startWith(0),
      catchError(error => {
        errorHandlingService.emitError({
          message: `Erreur dans la source d'afflux ${source.name}: ${error}`,
          code: 'INFLOW_SOURCE_ERROR',
          timestamp: Date.now(),
          context: 'inflowAggregator'
        });
        return of(0);
      })
    )
  );

  return combineLatest(sourceObservables).pipe(
    map(flows => {
      const aggregatedInflow = withErrorHandling(() => {
        const sourcesFlow: { [key: string]: number } = {};
        let totalInflow = 0;

        flows.forEach((flow, index) => {
          const sourceName = sources[index].name;
          sourcesFlow[sourceName] = flow;
          totalInflow += flow;
        });

        loggingService.info('Inflow aggregated', 'inflowAggregator', { totalInflow, sources: sourcesFlow });

        return { totalInflow, sources: sourcesFlow };
      }, 'inflowAggregator.aggregateInflow')();

      return aggregatedInflow;
    }),
    catchError(error => {
      errorHandlingService.emitError({
        message: `Erreur lors de l'agrégation des afflux: ${error}`,
        code: 'INFLOW_AGGREGATION_ERROR',
        timestamp: Date.now(),
        context: 'inflowAggregator'
      });
      return of({ totalInflow: 0, sources: {} });
    })
  );
}
