import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { Select2OptionData } from 'ng-select2';

/** Raw JSON shape returned by the backend lookup endpoints (mirrors SelectionDateCodeDto). */
interface LookupCodeDto {
  code: string;
  name: string;
  description?: string;
}


/**
 * Response row shape for the five dropdown lookup endpoints added 2026-08-24 (Individual/Bulk
 * Edit dropdown consistency fix). Mirrors `@cbiit/i2efsws-lib`'s generated `SelectionDateCodeDto`
 * (`code`/`name`/`description`) — these new endpoints were not yet available when this service
 * was written (the generated client had not been regenerated/republished), so this service calls
 * the same backend base path directly via `HttpClient`, matching the existing precedent in
 * `document.service.ts` for endpoints not (yet) covered by the generated client.
 *
 * <p><b>All five backing endpoints currently return mock/placeholder data</b> pending BA/DBA
 * confirmation of the authoritative source for each field (see
 * `FundingSubmDropdownLookupConstants` in `sm_i2e_fs_ws`). Once the generated client is
 * regenerated to include these endpoints, this service can be removed in favor of
 * `FundingSubmissionsControllerService`.</p>
 */
@Injectable({
  providedIn: 'root'
})
export class FundingSubmDropdownLookupService {

  private readonly basePath = '/i2efsws/api/v1/funding-submissions';

  private budgetCategories$: Observable<Select2OptionData[]>;
  private docDecisions$: Observable<Select2OptionData[]>;
  private docNciSelections$: Observable<Select2OptionData[]>;
  private annualFundingR01Options$: Observable<Select2OptionData[]>;
  private annualOrMyfOptions$: Observable<Select2OptionData[]>;

  constructor(private http: HttpClient) {}

  getBudgetCategories(): Observable<Select2OptionData[]> {
    if (!this.budgetCategories$) {
      this.budgetCategories$ = this.fetchAsSelect2Options(`${this.basePath}/budget-categories`);
    }
    return this.budgetCategories$;
  }

  getDocDecisions(): Observable<Select2OptionData[]> {
    if (!this.docDecisions$) {
      this.docDecisions$ = this.fetchAsSelect2Options(`${this.basePath}/doc-decisions`);
    }
    return this.docDecisions$;
  }

  getDocNciSelections(): Observable<Select2OptionData[]> {
    if (!this.docNciSelections$) {
      this.docNciSelections$ = this.fetchAsSelect2Options(`${this.basePath}/doc-nci-selections`);
    }
    return this.docNciSelections$;
  }

  getAnnualFundingR01Options(): Observable<Select2OptionData[]> {
    if (!this.annualFundingR01Options$) {
      this.annualFundingR01Options$ = this.fetchAsSelect2Options(`${this.basePath}/annual-funding-r01-options`);
    }
    return this.annualFundingR01Options$;
  }

  getAnnualOrMyfOptions(): Observable<Select2OptionData[]> {
    if (!this.annualOrMyfOptions$) {
      this.annualOrMyfOptions$ = this.fetchAsSelect2Options(`${this.basePath}/annual-or-myf-options`);
    }
    return this.annualOrMyfOptions$;
  }

  private fetchAsSelect2Options(url: string): Observable<Select2OptionData[]> {
    return this.http.get<LookupCodeDto[]>(url).pipe(
      map(rows => rows.map(row => ({ id: row.code, text: row.name } as Select2OptionData))),
      // Cache per lookup for the app's lifetime — shared across Individual Edit and Bulk Edit
      // so both screens issue only one HTTP call per lookup, not one each.
      shareReplay(1)
    );
  }
}
