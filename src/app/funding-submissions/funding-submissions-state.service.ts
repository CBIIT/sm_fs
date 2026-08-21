import { Injectable } from '@angular/core';
import { FundingSubmissionGrantSearchCriteriaDto, FundingSubmissionListSearchCriteriaDto, FundingSubmissionSearchResultDto } from '@cbiit/i2efsws-lib';

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

export interface SearchListsPageState {
  formValue: any;
  selectedDocs: string[];
  selectedListStatus: string;
  selectedSelectionDate: string;
  listIdFilter: string;
  searchCriteria: FundingSubmissionListSearchCriteriaDto;
  showResults: boolean;
}

@Injectable({ providedIn: 'root' })
export class FundingSubmissionsStateService {
  private listPageState: FundingListPageState | null = null;
  private searchListsState: SearchListsPageState | null = null;
  private freshNavigationRequested = false;

  saveListPageState(state: FundingListPageState): void {
    this.listPageState = state;
  }

  getListPageState(): FundingListPageState | null {
    return this.listPageState;
  }

  saveSearchListsState(state: SearchListsPageState): void {
    this.searchListsState = state;
  }

  getSearchListsState(): SearchListsPageState | null {
    return this.searchListsState;
  }

  clearListPageState(): void {
    this.listPageState = null;
  }

  clearSearchListsState(): void {
    this.searchListsState = null;
  }

  clearFundingSubmissionsState(): void {
    this.clearListPageState();
    this.clearSearchListsState();
  }

  requestFreshNavigation(): void {
    this.freshNavigationRequested = true;
    this.clearFundingSubmissionsState();
  }

  isFreshNavigationRequested(): boolean {
    return this.freshNavigationRequested;
  }

  consumeFreshNavigationRequest(): boolean {
    const requested = this.freshNavigationRequested;
    this.freshNavigationRequested = false;
    return requested;
  }
}
