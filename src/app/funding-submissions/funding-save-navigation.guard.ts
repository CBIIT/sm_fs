import { inject } from '@angular/core';
import { CanDeactivateFn, Route } from '@angular/router';
import { FundingSaveProgressService } from './funding-save-progress.service';

export const fundingSaveNavigationGuard: CanDeactivateFn<unknown> = () =>
  !inject(FundingSaveProgressService).active;

// Angular reuses a route for query-parameter-only navigation (e.g. a different listId, or Back)
// and skips its guards by default. A componentless wrapper reruns only this save guard on those
// changes, leaving the wrapped route's own guards on their existing schedule.
export function withFundingSaveNavigationGuard(route: Route): Route {
  const { path, ...child } = route;
  return {
    path,
    runGuardsAndResolvers: 'paramsOrQueryParamsChange',
    canDeactivate: [fundingSaveNavigationGuard],
    children: [{ path: '', ...child }]
  };
}
