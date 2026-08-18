import { Injectable } from '@angular/core';
import { FundingSubmissionGrantSearchCriteriaDto, FundingSubmissionSearchResultDto } from '@cbiit/i2efsws-lib';

export interface FundingListPageState {
  formValue: any;
  selectedCancerActivities: string[] | string;
  selectedDocs: string[];
  i2Status: string | string[];
  excludeInList: boolean;
  searchCriteria: FundingSubmissionGrantSearchCriteriaDto;
  selectedRows: Map<number, FundingSubmissionSearchResultDto>;
  showResults: boolean;
  currentPage: number;
}

@Injectable({ providedIn: 'root' })
export class FundingSubmissionsStateService {
  private listPageState: FundingListPageState | null = null;

  saveListPageState(state: FundingListPageState): void {
    this.listPageState = state;
  }

  getListPageState(): FundingListPageState | null {
    return this.listPageState;
  }
}
