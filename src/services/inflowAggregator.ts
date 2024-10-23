import { Observable, merge, map, scan, catchError, of, BehaviorSubject, switchMap, distinctUntilChanged, shareReplay, asyncScheduler } from 'rxjs';
import { observeOn, tap } from 'rxjs/operators';
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
  // Source principale avec scheduler
  const sources$ = new BehaviorSubject<InflowSourceInterface[]>(initialSources);
  
  function addSource(source: InflowSourceInterface) {
    asyncScheduler.schedule(() => {
      const currentSources = sources$.getValue();
      if (!currentSources.find(s => s.name === source.name)) {
        sources$.next([...currentSources, source]);
        
        // Logging asynchrone
        asyncScheduler.schedule(() => {
          loggingService.info('Source added to aggregator', 'inflowAggregator', { sourceName: source.name });
        });
      }
    });
  }

  function removeSource(name: string) {
    asyncScheduler.schedule(() => {
      const currentSources = sources$.getValue();
      const filteredSources = currentSources.filter(s => s.name !== name);
      if (filteredSources.length !== currentSources.length) {
        sources$.next(filteredSources);
        
        // Logging asynchrone
        asyncScheduler.schedule(() => {
          loggingService.info('Source removed from aggregator', 'inflowAggregator', { sourceName: name });
        });
      }
    });
  }

  // Optimisation du flux d'agrégation avec scheduler
  const aggregatedInflow$ = sources$.pipe(
    observeOn(asyncScheduler),
    distinctUntilChanged((prev, curr) => 
      prev.length === curr.length && 
      prev.every(s => curr.find(c => c.name === s.name))
    ),
    switchMap(sources => {
      // Optimisation des observables sources avec scheduler
      const sourceObservables = sources.map(source => 
        source.outflowRate$.pipe(
          observeOn(asyncScheduler),
          distinctUntilChanged(),
          map(rate => ({ name: source.name, rate }))
        )
      );

      if (sourceObservables.length === 0) {
        return of({ totalInflow: 0, sources: {} });
      }

      return merge(...sourceObservables).pipe(
        observeOn(asyncScheduler),
        scan((aggregated: AggregatedInflowInterface, current) => {
          // Calculs déplacés dans le scheduler
          const newSources = { ...aggregated.sources };
          newSources[current.name] = current.rate;
          
          const totalInflow = Object.values(newSources)
            .reduce((sum, rate) => sum + rate, 0);

          return {
            totalInflow,
            sources: newSources
          };
        }, { totalInflow: 0, sources: {} }),
        distinctUntilChanged((prev, curr) => 
          prev.totalInflow === curr.totalInflow &&
          Object.entries(prev.sources).every(([key, value]) => 
            curr.sources[key] === value
          )
        ),
        // Logging asynchrone des mises à jour
        tap(state => {
          asyncScheduler.schedule(() => {
            loggingService.info('Inflow state updated', 'inflowAggregator', { 
              totalInflow: state.totalInflow,
              sourceCount: Object.keys(state.sources).length
            });
          });
        }),
        shareReplay(1),
        catchError((error) => {
          asyncScheduler.schedule(() => {
            loggingService.error('Error in inflow aggregation', 'inflowAggregator', { error });
          });
          return of({ totalInflow: 0, sources: {} });
        })
      );
    })
  );

  return { 
    addSource, 
    removeSource, 
    aggregatedInflow$ 
  };
}
