import { Observable, merge, map, scan, catchError, of, BehaviorSubject, switchMap } from 'rxjs';
import { loggingService } from './loggingService';

export interface InflowSourceInterface {
  name: string;
  outflowRate$: Observable<number>;
}

export interface AggregatedInflowInterface {
  totalInflow: number;
  sources: Record<string, number>;
}

export function createInflowAggregator(initialSources: InflowSourceInterface[]): {
  addSource: (source: InflowSourceInterface) => void,
  removeSource: (name: string) => void,
  aggregatedInflow$: Observable<AggregatedInflowInterface>
} {
  const sources$ = new BehaviorSubject<InflowSourceInterface[]>(initialSources);

  function addSource(source: InflowSourceInterface) {
    const currentSources = sources$.getValue();
    sources$.next([...currentSources, source]);
  }

  function removeSource(name: string) {
    const currentSources = sources$.getValue();
    sources$.next(currentSources.filter(s => s.name !== name));
  }

  const aggregatedInflow$ = sources$.pipe(
    switchMap(sources => {
      const sourceObservables = sources.map(source => 
        source.outflowRate$.pipe(
          map(rate => ({ name: source.name, rate }))
        )
      );

      return merge(...sourceObservables).pipe(
        scan((aggregated: AggregatedInflowInterface, current) => {
          aggregated.sources[current.name] = current.rate;
          aggregated.totalInflow = Object.values(aggregated.sources).reduce((sum, rate) => sum + rate, 0);
          
          loggingService.info('Inflow aggregated', 'inflowAggregator', { 
            totalInflow: aggregated.totalInflow, 
            sources: aggregated.sources 
          });

          return aggregated;
        }, { totalInflow: 0, sources: {} }),
        map(aggregated => ({ ...aggregated })), // Create a new object to ensure change detection
        catchError((error) => {
          loggingService.error('Error in inflow aggregation', 'inflowAggregator', { error });
          return of({ totalInflow: 0, sources: {} });
        })
      );
    })
  );

  return { addSource, removeSource, aggregatedInflow$ };
}
