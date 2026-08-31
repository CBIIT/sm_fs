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
 * Response row shape for the dropdown lookup endpoints added for Individual/Bulk Edit dropdown
 * consistency. Mirrors `@cbiit/i2efsws-lib`'s generated `SelectionDateCodeDto`
 * (`code`/`name`/`description`) — these endpoints predate the generated client's coverage, so
 * this service calls the backend base path directly via `HttpClient`, matching the existing
 * precedent in `document.service.ts` for endpoints not (yet) covered by the generated client.
 *
 * <p><b>Backing data source:</b> {@code getBudgetCategories()}, {@code getDocNciSelections()},
 * and {@code getAnnualOrMyfOptions()} are backed by real, DBA-provided lookup tables
 * ({@code FUNDING_SUBM_BUD_CAT_CODES_T}/{@code FUNDING_SUBM_DOC_NCI_SEL_CODES_T}/
 * {@code FUNDING_SUBM_MYF_AF_CODES_T} respectively, via `sm_i2e_fs_ws`'s
 * `FundingSubmissionsServiceImpl`). {@code getDocDecisions()} and
 * {@code getAnnualFundingR01Options()} remain mock/placeholder data
 * ({@code FundingSubmDropdownLookupConstants} in `sm_i2e_fs_ws`) because no corresponding lookup
 * table exists in the schema for DOC Decision or Two-Year Annual Funding R01 — this is a schema
 * gap, not an oversight. Once the generated client covers these endpoints, this service can be
 * removed in favor of `FundingSubmissionsService`.</p>
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
      this.annualFundingR01Options$ = this.fetchAsSelect2Options(`${this.basePath}/annual-funding-r01-options`).pipe(
        map(options => options.filter(option => option.id === 'Yes' || option.text === 'Yes'))
      );
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
