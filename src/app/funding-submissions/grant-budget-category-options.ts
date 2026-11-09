import { FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { Select2OptionData } from 'ng-select2';
import { catchError, defaultIfEmpty, defer, map, mergeMap, of, Subject, Subscription, take } from 'rxjs';

import { FundingRequestErrorScopeService } from './funding-request-error-scope.service';
import { mapLookupOptions } from './funding-subm-dropdown-lookup.service';

export interface GrantBudgetCategoryState {
  status: 'loading' | 'ready' | 'error';
  options: Select2OptionData[];
  error?: unknown;
}

const EMPTY_OPTIONS: Select2OptionData[] = [];

/**
 * One cache per editor. The queue bounds network concurrency and scopes each
 * subscription individually; a failed grant does not terminate the queue.
 */
export class GrantBudgetCategoryOptions {
  private readonly states = new Map<number, GrantBudgetCategoryState>();
  private readonly selections = new Map<number, {
    options: Select2OptionData[]; code: string; result: Select2OptionData[];
  }>();
  private readonly requests = new Subject<number>();
  private readonly subscription: Subscription;
  private destroyed = false;

  constructor(
    funding: FundingSubmissionsService,
    errorScope: FundingRequestErrorScopeService,
    private readonly onUpdate: (applId: number, state: GrantBudgetCategoryState) => void,
    concurrency = 4
  ) {
    this.subscription = this.requests.pipe(
      mergeMap(applId => defer(() => errorScope.handleLocally(funding.getBudgetCategoryOptions(applId))).pipe(
        take(1),
        defaultIfEmpty(null),
        map(response => {
          if (!Array.isArray(response) || response.length === 0 || response.some(row =>
            !row || typeof row.code !== 'string' || !row.code.trim()
            || typeof row.name !== 'string' || !row.name.trim()
            // The shared lookup has historically used the misspelled "ACTIVIY CODE".
            || (row.code.trim().toUpperCase() === 'ACTCD' && /^activi(?:ty|y)\s+code$/i.test(row.name.trim())))) {
            throw new Error('Budget Categories options are empty or invalid.');
          }
          return { applId, state: { status: 'ready', options: mapLookupOptions(response) } as GrantBudgetCategoryState };
        }),
        catchError(error => of({
          applId,
          state: { status: 'error', options: EMPTY_OPTIONS, error } as GrantBudgetCategoryState
        }))
      ), concurrency)
    ).subscribe(({ applId, state }) => {
      if (!this.destroyed) {
        this.states.set(applId, state);
        this.onUpdate(applId, state);
      }
    });
  }

  request(applId: number): void {
    if (this.destroyed || !Number.isFinite(applId) || applId <= 0 || this.states.has(applId)) {
      return;
    }
    this.states.set(applId, { status: 'loading', options: EMPTY_OPTIONS });
    this.requests.next(applId);
  }

  retry(applId: number): void {
    const state = this.states.get(applId);
    if (state && state.status !== 'loading') {
      this.states.delete(applId);
      this.request(applId);
    }
  }

  state(applId: number): GrantBudgetCategoryState | undefined {
    return this.states.get(applId);
  }

  optionsFor(applId: number, code: string | null | undefined): Select2OptionData[] {
    const options = this.states.get(applId)?.options ?? EMPTY_OPTIONS;
    if (!code || options.some(option => option.id === code)) {
      return options;
    }
    const previous = this.selections.get(applId);
    if (previous?.options === options && previous.code === code) {
      return previous.result;
    }
    const result = [...options, { id: code, text: `${code} (unresolved)` }];
    this.selections.set(applId, { options, code, result });
    return result;
  }

  hasUnresolvedSelection(applId: number, code: string | null | undefined): boolean {
    return !!code && !this.states.get(applId)?.options.some(option => option.id === code);
  }

  destroy(): void {
    this.destroyed = true;
    this.subscription.unsubscribe();
    this.requests.complete();
  }
}
