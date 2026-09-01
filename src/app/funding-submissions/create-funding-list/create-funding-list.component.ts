import { Component, AfterViewInit, OnDestroy, ViewChild } from '@angular/core';
import { FundSelectSearchCriteria, FundingSubmissionGrantSearchCriteriaDto } from '@cbiit/i2efsws-lib';
import { AppPropertiesService, PdCaIntegratorService as LibPdCaIntegratorService } from '@cbiit/i2ecui-lib';
import { PdCaIntegratorService, PD_CA_DEFAULT_CHANNEL } from '../../service/pd-ca-integrator.service';
import { NGXLogger } from 'ngx-logger';
import { NgForm } from '@angular/forms';
import { getCurrentFiscalYear } from '../../utils/utils';
import { CreateFundingTableComponent } from './create-funding-table/create-funding-table.component';
import { FundingSubmissionsStateService } from '../funding-submissions-state.service';

@Component({
  selector: 'app-create-funding-list',
  templateUrl: './create-funding-list.component.html',
  styleUrls: ['./create-funding-list.component.css']
})
export class CreateFundingListComponent implements AfterViewInit, OnDestroy {

  @ViewChild('filterForm') filterForm: NgForm;
  @ViewChild('assignedCas') assignedCas: any;
  @ViewChild(CreateFundingTableComponent) fundingTable: CreateFundingTableComponent;

  fiscalYear: number;
  grantViewerUrl: string;
  eGrantsUrl: string;
  i2eURL: string;

  selectedCancerActivities: string[] | string = [];
  selectedDocs: string[] = [];
  i2Status: string | string[];
  excludeInList = true;
  searchCriteria: FundSelectSearchCriteria = {};
  private readonly CA_DOC_CHANNEL = 'CA_DOC_DEFAULT_CHANNEL';

  constructor(
    private propertiesService: AppPropertiesService,
    private libPdCaIntegratorService: LibPdCaIntegratorService,
    private pdCaIntegratorService: PdCaIntegratorService,
    private logger: NGXLogger,
    private stateService: FundingSubmissionsStateService
  ) {
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
    this.eGrantsUrl = this.propertiesService.getProperty('EGRANTS_URL');
    this.i2eURL = this.propertiesService.getProperty('I2EWEB_URL').trim();
    this.fiscalYear = getCurrentFiscalYear();
  }

  ngAfterViewInit(): void {
    const freshNavigation = this.stateService.consumeFreshNavigationRequest();
    if (freshNavigation) {
      this.reset();
    }

    const state = this.stateService.getListPageState();
    if (!freshNavigation && state) {
      setTimeout(() => {
        this.selectedDocs = state.selectedDocs;
        if (this.selectedDocs.length) {
          this.onDocSelected(state.selectedDocs);
        }
        const restoredCancerActivities = Array.isArray(state.selectedCancerActivities)
          ? state.selectedCancerActivities.filter(Boolean)
          : state.selectedCancerActivities;
        this.selectedCancerActivities = (Array.isArray(restoredCancerActivities)
          ? (restoredCancerActivities.length ? restoredCancerActivities : '')
          : (restoredCancerActivities || ''));
        this.i2Status = state.i2Status;
        this.excludeInList = state.excludeInList;
        this.filterForm?.form.patchValue(state.formValue);
        if (state.showResults) {
          this.fundingTable?.restoreState(state.selectedRows, state.currentPage);
          this.fundingTable?.search(state.searchCriteria);
        }
      });
    }
  }

  onTableFirstDraw(): void {
    const state = this.stateService.getListPageState();
    const $ = (window as any).jQuery;
    if (!state || !$) return;
    const ncabRange = state.formValue?.ncabRange;
    if (!ncabRange?.fromNcab && !ncabRange?.toNcab) return;

    // getBodDatesList() runs concurrently with the grant search; options may not be
    // in the DOM yet when initComplete fires. Poll until they arrive (length > 1
    // means the API-loaded options are present alongside the static blank option).
    let retries = 0;
    const applyNcab = () => {
      if (!this.filterForm) return;
      if ($('#fromNcab option').length > 1) {
        // Options loaded; patchValue → writeValue → setElementValue → trigger('change.select2')
        this.filterForm.form.get('ncabRange')?.patchValue(ncabRange);
      } else if (retries++ < 30) {
        setTimeout(applyNcab, 100);
      }
    };
    applyNcab();
  }

  ngOnDestroy(): void {
    if (this.stateService.isFreshNavigationRequested()) {
      return;
    }

    const tableState = this.fundingTable?.getState();
    if (tableState) {
      this.stateService.saveListPageState({
        formValue: this.filterForm?.form.value,
        selectedCancerActivities: this.selectedCancerActivities,
        selectedDocs: this.selectedDocs,
        i2Status: this.i2Status,
        excludeInList: this.excludeInList,
        ...tableState
      });
    }
  }

  onDocSelected(docs: string[]): void {
    this.selectedDocs = docs || [];
    this.pdCaIntegratorService.docEmitter.next({ doc: this.selectedDocs.length ? this.selectedDocs : null, channel: PD_CA_DEFAULT_CHANNEL });
  }

  onCancerActivitiesSelected(cancerActivities: string[] | string): void {
    const normalizedCancerActivities = Array.isArray(cancerActivities)
      ? cancerActivities.filter(Boolean)
      : (cancerActivities ? [cancerActivities] : []);
    this.selectedCancerActivities = normalizedCancerActivities.length ? normalizedCancerActivities : '';

    // Ensure DOC dropdown refreshes against the latest CA selection.
    // lib-doc-dropdown filters on caForDocEmitter only when its own selected DOCs are empty.
    this.selectedDocs = [];

    const caCodes = normalizedCancerActivities;

    this.libPdCaIntegratorService.caForDocEmitter.next({
      code: caCodes.length ? caCodes : null,
      channel: this.CA_DOC_CHANNEL
    });
  }

  get hasAnyCriteria(): boolean {
    const formValue = this.filterForm?.form.value || {};
    const grantNumber = formValue.grantNumber || {};
    const ncabRange = formValue.ncabRange || {};
    const fyRange = formValue.fyRange || {};
    const irgRange = formValue.irgPercentileRange || {};
    const pscRange = formValue.priorityScoreRange || {};
    const caArray = this.selectedCancerActivities;
    const i2Array = this.i2Status;
    const nofoArray = formValue.rfaPa;
    const mechArray = formValue.mechSelect;
    const typeArray = formValue.typeSelect;
    return !!(
      grantNumber.grantNumberType ||
      grantNumber.grantNumberMech ||
      grantNumber.grantNumberIC ||
      grantNumber.grantNumberSerial ||
      grantNumber.grantNumberYear ||
      grantNumber.grantNumberSuffix ||
      formValue.pdName ||
      this.selectedDocs.length > 0 ||
      (Array.isArray(caArray) ? caArray.length > 0 : !!caArray) ||
      (Array.isArray(i2Array) ? i2Array.length > 0 : !!i2Array) ||
      this.searchCriteria?.piName ||
      (Array.isArray(nofoArray) ? nofoArray.length > 0 : !!nofoArray) ||
      !!formValue.nosi ||
      fyRange.fromFy ||
      fyRange.toFy ||
      ncabRange.fromNcab ||
      ncabRange.toNcab ||
      (irgRange.fromIrgPercentile !== '' && irgRange.fromIrgPercentile != null) ||
      (irgRange.toIrgPercentile !== '' && irgRange.toIrgPercentile != null) ||
      (pscRange.fromPriorityScore !== '' && pscRange.fromPriorityScore != null) ||
      (pscRange.toPriorityScore !== '' && pscRange.toPriorityScore != null) ||
      (Array.isArray(typeArray) ? typeArray.length > 0 : !!typeArray) ||
      (Array.isArray(mechArray) ? mechArray.length > 0 : !!mechArray)
    );
  }

  search(): void {
    if (this.filterForm?.invalid || !this.hasAnyCriteria) {
      return;
    }

    if (!this.fundingTable) {
      this.logger.error('CreateFundingListComponent: fundingTable ViewChild is not available');
      return;
    }
    const formValue = this.filterForm?.form.value || {};
    const grantNumberForm = formValue.grantNumber || {};

    const criteria: FundingSubmissionGrantSearchCriteriaDto = {};
    criteria.grantType = grantNumberForm.grantNumberType;
    criteria.grantNumberMech = grantNumberForm.grantNumberMech;
    criteria.grantTypeCodes = Array.isArray(formValue.typeSelect) && formValue.typeSelect.length
      ? formValue.typeSelect.map((v: string) => Number(v)).filter((n: number) => !isNaN(n))
      : undefined;
    criteria.mechanismCodes = Array.isArray(formValue.mechSelect) && formValue.mechSelect.length
      ? formValue.mechSelect
      : undefined;
    criteria.icCode = grantNumberForm.grantNumberIC;
    criteria.serialNumber = grantNumberForm.grantNumberSerial;
    criteria.supportYear = grantNumberForm.grantNumberYear;
    criteria.suffixCode = grantNumberForm.grantNumberSuffix;

    const toNum = (v: any): number | undefined => (v !== '' && v != null) ? Number(v) : undefined;

    const fyRange = formValue.fyRange || {};
    criteria.fyRangeFrom = toNum(fyRange.fromFy);
    criteria.fyRangeTo = toNum(fyRange.toFy);

    const ncabRange = formValue.ncabRange || {};
    criteria.ncabRangeFrom = ncabRange.fromNcab;
    criteria.ncabRangeTo = ncabRange.toNcab;

    criteria.piName = this.searchCriteria.piName;
    criteria.pdName = formValue.pdName;
    criteria.divisionOfficeCenter = this.selectedDocs.length ? this.selectedDocs : undefined;
    criteria.cancerActivity = Array.isArray(this.selectedCancerActivities) && this.selectedCancerActivities.length
      ? (this.selectedCancerActivities as string[])
      : (this.selectedCancerActivities && !Array.isArray(this.selectedCancerActivities) ? [this.selectedCancerActivities as string] : undefined);
    criteria.impacStatus = Array.isArray(this.i2Status)
      ? (this.i2Status as FundingSubmissionGrantSearchCriteriaDto.ImpacStatusEnum[])
      : (this.i2Status ? [this.i2Status as FundingSubmissionGrantSearchCriteriaDto.ImpacStatusEnum] : undefined);
    criteria.nofo = Array.isArray(formValue.rfaPa) && formValue.rfaPa.length ? formValue.rfaPa : undefined;
    criteria.nosi = formValue.nosi ? [formValue.nosi] : undefined;

    const irgRange = formValue.irgPercentileRange || {};
    criteria.irgPercentileFrom = toNum(irgRange.fromIrgPercentile);
    criteria.irgPercentileTo = toNum(irgRange.toIrgPercentile);

    const pscRange = formValue.priorityScoreRange || {};
    criteria.priorityScoreFrom = toNum(pscRange.fromPriorityScore);
    criteria.priorityScoreTo = toNum(pscRange.toPriorityScore);
    criteria.excludeGrantsAlreadyInList = this.excludeInList;

    this.fundingTable.search(criteria);
  }

  reset(): void {
    this.fundingTable?.clearResults();
    this.selectedCancerActivities = '';
    this.selectedDocs = [];
    this.i2Status = '';
    this.excludeInList = true;
    this.searchCriteria = {};

    this.filterForm?.form.patchValue({
      grantNumber: {
        grantNumberType: '',
        grantNumberMech: '',
        grantNumberIC: '',
        grantNumberSerial: '',
        grantNumberYear: '',
        grantNumberSuffix: ''
      },
      pdName: null,
      doc: null,

      piName: '',
      fyRange: {
        fromFy: null,
        toFy: null
      },
      ncabRange: {
        fromNcab: '',
        toNcab: ''
      },
      rfaPa: [],
      nosi: null,
      mechSelect: [],
      typeSelect: [],
      irgPercentileRange: { fromIrgPercentile: null, toIrgPercentile: null },
      priorityScoreRange: { fromPriorityScore: null, toPriorityScore: null }
    });

    // Clear CA UI selection without binding [selectedValue], to avoid input/output loops.
    if (this.assignedCas) {
      this.assignedCas.selectedValue = null;
    }
  }
}