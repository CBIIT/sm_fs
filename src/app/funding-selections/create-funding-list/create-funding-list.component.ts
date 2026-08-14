import { Component, AfterViewInit, ViewChild } from '@angular/core';
import { FundSelectSearchCriteria, FundingAllocationGrantSearchCriteriaDto } from '@cbiit/i2efsws-lib';
import { AppPropertiesService, PdCaIntegratorService as LibPdCaIntegratorService } from '@cbiit/i2ecui-lib';
import { PdCaIntegratorService, PD_CA_DEFAULT_CHANNEL } from '../../service/pd-ca-integrator.service';
import { NGXLogger } from 'ngx-logger';
import { NgForm } from '@angular/forms';
import { getCurrentFiscalYear } from '../../utils/utils';
import { CreateFundingTableComponent } from './create-funding-table/create-funding-table.component';

@Component({
  selector: 'app-create-funding-list',
  templateUrl: './create-funding-list.component.html',
  styleUrls: ['./create-funding-list.component.css']
})
export class CreateFundingListComponent implements AfterViewInit {

  @ViewChild('filterForm') filterForm: NgForm;
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

  constructor(
    private propertiesService: AppPropertiesService,
    private libPdCaIntegratorService: LibPdCaIntegratorService,
    private pdCaIntegratorService: PdCaIntegratorService,
    private logger: NGXLogger
  ) {
    this.grantViewerUrl = this.propertiesService.getProperty('GRANT_VIEWER_URL');
    this.eGrantsUrl = this.propertiesService.getProperty('EGRANTS_URL');
    this.i2eURL = this.propertiesService.getProperty('I2EWEB_URL').trim();
    this.fiscalYear = getCurrentFiscalYear();
  }

  ngAfterViewInit(): void {
    // trigger lib-doc-dropdown to load all NCI docs on init (it relies on this event to populate)
    this.libPdCaIntegratorService.caForDocEmitter.next({ code: [], channel: 'CA_DOC_DEFAULT_CHANNEL' });
  }

  onDocSelected(docs: string[]): void {
    this.selectedDocs = docs || [];
    this.pdCaIntegratorService.docEmitter.next({ doc: this.selectedDocs.length ? this.selectedDocs : null, channel: PD_CA_DEFAULT_CHANNEL });
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
    if (!this.fundingTable) {
      this.logger.error('CreateFundingListComponent: fundingTable ViewChild is not available');
      return;
    }
    const formValue = this.filterForm?.form.value || {};
    const grantNumberForm = formValue.grantNumber || {};

    const criteria: FundingAllocationGrantSearchCriteriaDto = {};
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
      ? (this.i2Status as FundingAllocationGrantSearchCriteriaDto.ImpacStatusEnum[])
      : (this.i2Status ? [this.i2Status as FundingAllocationGrantSearchCriteriaDto.ImpacStatusEnum] : undefined);
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
    this.selectedCancerActivities = [];
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
  }
}