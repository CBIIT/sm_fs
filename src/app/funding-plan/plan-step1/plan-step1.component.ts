import {AfterViewInit, Component, OnDestroy, OnInit, TemplateRef, ViewChild} from '@angular/core';
import { Options } from 'select2';
import { Select2OptionData } from 'ng-select2';
import { FsPlanControllerService, FundingPlanRfaPaDto, RfaPaNcabDate } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { FundingPlanNcabDto } from '@nci-cbiit/i2ecws-lib/model/fundingPlanNcabDto';
import { Subject } from 'rxjs';
import { FullGrantNumberCellRendererComponent } from '../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import { CancerActivityCellRendererComponent } from '../../table-cell-renderers/cancer-activity-cell-renderer/cancer-activity-cell-renderer.component';
import { ExistingRequestsCellRendererComponent } from '../../table-cell-renderers/existing-requests-cell-renderer/existing-requests-cell-renderer.component';
import { PlanModel } from '../../model/plan/plan-model';
import { FundingPlanGrantSearchCriteria } from '@nci-cbiit/i2ecws-lib/model/fundingPlanGrantSearchCriteria';
import { GrantsSearchResultDatatableDto } from '@nci-cbiit/i2ecws-lib/model/grantsSearchResultDatatableDto';
import { DataTableDirective } from 'angular-datatables';
import { SelectGrantCheckboxCellRendererComponent } from './select-grant-checkbox-cell-renderer/select-grant-checkbox-cell-renderer.component';
import { SelectGrantCheckboxEventType } from './select-grant-checkbox-cell-renderer/select-grant-checkbox-event-type';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { Router } from '@angular/router';
import { GrantsSearchFilterService } from '../../funding-request/grants-search/grants-search-filter.service';
import { getCurrentFiscalYear } from '../../utils/utils';
import { NavigationStepModel } from 'src/app/funding-request/step-indicator/navigation-step.model';


/**
 * Data representation of each row for Rfa Pa dropdown and NCAB dates dropdown
 */
class RfaPaEntry {
  selectedNcabDates: string[] | string = [];
  delayedSelectedNcabs:  string[] | string = null;
  rfaPaNumber = '';
  availableNcabDates: Array<Select2OptionData> = [];
  parent: FundingPlanGrantsSearchCriteriaUI;
  ncabErrors: Array<FundingPlanNcabDto> = [];
  rfaErrDuplcated = false;
  rfaErrRequired = false;
  ncabErrRequired = false;

  constructor(parent: FundingPlanGrantsSearchCriteriaUI) {
    // The callback comes from the parent FundingPlanGrantsSearchCriteriaUI instance to update
    // a list of available NCAB dates when Rfa Pa selection changed
    this.parent = parent;
    this.selectedNcabDates = [];
    this.availableNcabDates = [];
    this.rfaPaNumber = '';
  }

  getNcabDates(): Array<string> {
    const ret = new Array<string>();
    if (this.selectedNcabDates instanceof Array) {
      for (const ncab of this.selectedNcabDates) {
        ret.push(ncab);
      }
    }
    return ret;
  }


  onNcabChangeSelection($event: string | string[]): void {
    // validation
    //console.log('*** on ncab change selection ', this.rfaPaNumber, $event);
    if (this.delayedSelectedNcabs) {
      setTimeout(() => {
        //console.log('*** on ncab change DELAYED selection ', this.rfaPaNumber, this.delayedSelectedNcabs);
        this.selectedNcabDates = this.delayedSelectedNcabs;
        this.delayedSelectedNcabs = null;
        this._checkNcabForErrors(this.selectedNcabDates);
      }, 200);
      return;
    }
    // reset 'ncab required' error
    this._checkNcabForErrors($event);
  }

  _checkNcabForErrors(selected: string | string[]): void {
    this.ncabErrors = [];
    if (selected instanceof Array) {
      for (const ncab of selected) {
        const dto: FundingPlanNcabDto = this._findNcabDto(ncab);
        if (dto != null
          && dto.currentPlanStatus != null
          && dto.currentPlanStatus != 'COMPLETED'
          && dto.currentPlanStatus != 'REJECTED'
          && dto.currentPlanStatus != 'CANCELLED') {
          this.ncabErrors.push(dto);
        }
      }
    }
    this.ncabErrRequired = false;
  }

  _findNcabDto(ncab: string): FundingPlanNcabDto {
    for (const entry of this.availableNcabDates) {
      if (entry.additional.councilMeetingDate === ncab) {
        return entry.additional;
      }
    }
    return null;
  }
}

/**
 * Data representation of search criteria view.
 */
class FundingPlanGrantsSearchCriteriaUI {
  rfaPaEntries: Array<RfaPaEntry> = [];
  ncabMap: Map<string, Array<Select2OptionData>>;
  activityCodesMap: Map<string, string>;
  availableRfaPas: Array<Select2OptionData> = [];
  errActivityCodes: Array<string> = [];

  constructor() {
    this.ncabMap = new Map<string, Array<Select2OptionData>>();
    this.activityCodesMap = new Map<string, string>();
    this.rfaPaEntries.push(new RfaPaEntry(this));
  }

  public onChangeRfaPaEntry(rfaPa: string, index: number): string[] {
    const entry = this.rfaPaEntries[index];
    //console.log('*** parent - on change rfa pa entry ', rfaPa, entry.selectedNcabDates);
    entry.rfaErrRequired = false;
    entry.ncabErrRequired = false;
    if (this.ncabMap.has(rfaPa)) {
      if (this.ncabMap.get(rfaPa) && this.ncabMap.get(rfaPa).length == 1) {
        const selected: string[] = [];
        selected.push(this.ncabMap.get(rfaPa)[0].id);
        entry.delayedSelectedNcabs = selected;
      }
      else if (entry.delayedSelectedNcabs === null) {
        entry.delayedSelectedNcabs = [];
      }
      entry.availableNcabDates = this.ncabMap.get(rfaPa);
    } else {
      entry.availableNcabDates = [];
      entry.delayedSelectedNcabs = [];
    }
    // if (entry.availableNcabDates.length == 1) {
    //   selected.push(entry.availableNcabDates[0].id);
    // }
    this.validateForRfaPaDuplicate();
    if (this.errActivityCodes.length > 0) {
      this.validateForActivityCodes();
    }
    return [];
  }

  // Validate for duplication (from bottom to up)
  public validateForRfaPaDuplicate() {
    for (let i = this.rfaPaEntries.length - 1; i > 0; i--) {
      const rfaPa = this.rfaPaEntries[i].rfaPaNumber;
      let duplicated = false;
      if (rfaPa && rfaPa.length > 0) {
        for (let j = 0; j < i; j++) {
          if (rfaPa === this.rfaPaEntries[j].rfaPaNumber) {
            duplicated = true;
            break;
          }
        }
      }
      this.rfaPaEntries[i].rfaErrDuplcated = duplicated;
    }
  }

  // Validate for required fields
  public validateForRequired() {
    for (const entry of this.rfaPaEntries) {
      if (!entry.rfaPaNumber || entry.rfaPaNumber.length == 0) {
        entry.rfaErrRequired = true;
      }
      if (!entry.selectedNcabDates || entry.selectedNcabDates.length == 0) {
        entry.ncabErrRequired = true;
      }
    }
  }

  // Validate for activity codes
  public validateForActivityCodes(): boolean {
    const valid = this._validateForActivityCodes();
    const errs = [];
    if (!valid) {
      for (const entry of this.rfaPaEntries) {
        if (entry.rfaPaNumber && entry.rfaPaNumber.length > 0) {
          errs.push(entry.rfaPaNumber + ': ' + this.activityCodesMap.get(entry.rfaPaNumber));
        }
      }
    }
    this.errActivityCodes = errs;
    return valid;
  }

  public getIndex(rfapa: string): number {
    for (let i = 0; i < this.rfaPaEntries.length; i++) {
      if (rfapa === this.rfaPaEntries[i].rfaPaNumber) {
        return i;
      }
    }
    return -1;
  }
  _validateForActivityCodes(): boolean {
    for (let i = 0; i < this.rfaPaEntries.length - 1; i++) {
      if (this.rfaPaEntries[i].rfaPaNumber && this.rfaPaEntries[i].rfaPaNumber.length > 0) {
        const ac = this.activityCodesMap.get(this.rfaPaEntries[i].rfaPaNumber);
        for (let j = i + 1; j < this.rfaPaEntries.length; j++) {
          if (this.rfaPaEntries[j].rfaPaNumber && this.rfaPaEntries[j].rfaPaNumber.length > 0 &&
            ac != this.activityCodesMap.get(this.rfaPaEntries[j].rfaPaNumber)) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // Check for errors
  public isValid(): boolean {
    for (const entry of this.rfaPaEntries) {
      if (entry.rfaErrDuplcated || entry.rfaErrRequired || entry.ncabErrRequired || (entry.ncabErrors && entry.ncabErrors.length > 0)) {
        return false;
      }
    }
    if (this.errActivityCodes.length > 0) {
      return false;
    }
    return true;
  }
}

// =================================================================

@Component({
  selector: 'app-plan-step1',
  templateUrl: './plan-step1.component.html',
  styleUrls: ['./plan-step1.component.css']
})
export class PlanStep1Component implements OnInit, AfterViewInit, OnDestroy {

  constructor(private fsPlanControllerService: FsPlanControllerService,
              private router: Router,
              private planModel: PlanModel,
              private logger: NGXLogger,
              private navigationModel: NavigationStepModel) {
  }

  @ViewChild(DataTableDirective, { static: false }) dtElement: DataTableDirective;
  @ViewChild('selectGrantCheckboxRenderer') selectGrantCheckboxRenderer: TemplateRef<SelectGrantCheckboxCellRendererComponent>;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;
  @ViewChild('cancerActivityRenderer') cancerActivityRenderer: TemplateRef<CancerActivityCellRendererComponent>;
  @ViewChild('existingRequestsRenderer') existingRequestsRenderer: TemplateRef<ExistingRequestsCellRendererComponent>;

  // controls if user can switch to another view from the current one
  canDeactivate = true;

  // controls Select Grants button and it's tooltip depending on
  // current grants selection
  cannotSelectGrantsTooltip: string = null;

  // Options for multiselectable NCAB dropdown
  ncab_options: Options;
  // Internal Search Criteria data including selected and
  // available data (lookups)
  searchCriteria: FundingPlanGrantsSearchCriteriaUI;

  grantViewerUrl: string = this.planModel.grantViewerUrl;
  eGrantsUrl: string = this.planModel.eGrantsUrl;

  dtTrigger: Subject<any> = new Subject();
  dtOptions: any = {};
  dtData: Array<NciPfrGrantQueryDtoEx> = [];
  // controls the error message shown after search if there are
  // no grants eligible for selection
  noSelectableGrants = false;
  noSelectableGrantsWarining: string = '';

  ngOnInit(): void {
    this.navigationModel.showSteps = true;
    this.navigationModel.setStepLinkable(1, true);
    this.ncab_options = {
      multiple: true,
      allowClear: false
    };

    this.searchCriteria = new FundingPlanGrantsSearchCriteriaUI();
    this._restoreFromModel();
    this.grantSelectionTooltip();

    this.fsPlanControllerService.getRfaPaListUsingGET().subscribe(
      (result: Array<FundingPlanRfaPaDto>) => {
        const tmp: Array<Select2OptionData> = [];

        const currentFprId = this.planModel.fundingPlanDto?.fprId;

        let index = 0;
        for (const entry of result) {
          index = index + 1;
          if (entry.rfaPaNumber && entry.rfaPaNumber.length > 0) {
            tmp.push({
              id: entry.rfaPaNumber,
              text: entry.rfaPaNumber
            });
            const ncabTmp: Array<Select2OptionData> = [];
            for (const ncabEntry of entry.ncabs) {
              // remove the reference to the current FPRId if exist
              if (currentFprId && ncabEntry.fprId === currentFprId) {
                ncabEntry.fprId = null;
                ncabEntry.currentPlanStatus = null;
              }
              ncabTmp.push({
                id: ncabEntry.councilMeetingDate,
                text: ncabEntry.formattedCouncilMeetingDate,
                additional: ncabEntry
              });
            }
            this.searchCriteria.ncabMap.set(entry.rfaPaNumber, ncabTmp);
            this.searchCriteria.activityCodesMap.set(entry.rfaPaNumber, entry.activityCodes);
          }
        }
        this.searchCriteria.availableRfaPas = tmp;
        for (const entry of this.searchCriteria.rfaPaEntries) {
          if (this.searchCriteria.ncabMap.has(entry.rfaPaNumber)) {
            entry.availableNcabDates = this.searchCriteria.ncabMap.get(entry.rfaPaNumber);
          } else {
            entry.availableNcabDates = [];
          }
        }
      },
      error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });

  }

  ngAfterViewInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 100,
      language: {
        paginate: {
          first: '<i class="far fa-chevron-double-left" title="First"></i>',
          previous: '<i class="far fa-chevron-left" title="Previous"></i>',
          next: '<i class="far fa-chevron-right" title="Next"></i>',
          last: '<i class="far fa-chevron-double-right" Last="First"></i>'
        }
      },

      data: this.dtData,
      columns: [
        { title: 'Sel', data: 'selected', ngTemplateRef: { ref: this.selectGrantCheckboxRenderer }, className: 'all' }, // 0
        {
          title: 'Grant Number',
          data: 'fullGrantNum',
          ngTemplateRef: { ref: this.fullGrantNumberRenderer },
          className: 'all'
        }, // 1
        {
          title: 'PI', data: 'piFullName', render: (data, type, row, meta) => { // 2
            return (!data || data == null) ? '' : '<a href="mailto:' + row.piEmail + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }, className: 'all'
        },
        { title: 'Project Title', data: 'projectTitle' }, // 3
        {
          title: 'FOA', data: 'rfaPaNumber', render: (data, type, row, meta) => { // 4
            return (!data || data == null) ? '' : '<a href="' + row.nihGuideAddr + '" target="_blank" >' + data + '</a>';
          }
        },
        { title: 'I2 Status', data: 'applStatusGroupDescrip' }, // 5
        {
          title: 'PD', data: 'pdFullName', render: (data, type, row, meta) => { // 6
            return (!data || data == null) ? '' : '<a href="mailto:' + row.pdEmailAddress + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }
        },
        { title: 'CA', data: 'cayCode', ngTemplateRef: { ref: this.cancerActivityRenderer }, className: 'all' }, // 7
        { title: 'FY', data: 'fy' }, // 8
        {
          title: 'NCAB', data: 'councilMeetingDate', defaultContent: '', render: (data, type, row, meta) => { // 9
            return (data) ? data.substr(4, 2) + '/' + data.substr(0, 4) : '';
          }
        },
        { title: 'Pctl', data: 'irgPercentileNum' }, // 10
        { title: 'PriScr', data: 'priorityScoreNum' }, // 11
        { title: 'Budget Start Date', data: 'budgetStartDate' }, // 12
        {
          title: 'Existing Requests', data: 'requestCount', // 13
          ngTemplateRef: { ref: this.existingRequestsRenderer }, className: 'all'
        },
        { data: null, defaultContent: '' }
      ],
      order: [[11, 'asc']],
      responsive: {
        details: {
          type: 'column',
          target: -1
        }
      },
      columnDefs: [
        {
          className: 'control',
          orderable: false,
          targets: -1
        },
        { orderable: false, targets: 0 }, // check box
        { responsivePriority: 1, targets: 1 }, // grant_num
        { responsivePriority: 3, targets: 2 }, // pi
        { responsivePriority: 4, targets: 9 }, // ncab
        { responsivePriority: 5, targets: 8 }, // fy
        { responsivePriority: 6, targets: 6 }, // pd
        { responsivePriority: 7, targets: 7 }, // ca
        { responsivePriority: 8, targets: 10 }, // pctl
        { responsivePriority: 9, targets: 11 }, // priscr
        { responsivePriority: 10, targets: 4 }, // FOA
        { responsivePriority: 11, targets: 13 }, // existing requests
        { responsivePriority: 12, targets: 3 }, // project title
        { responsivePriority: 13, targets: 5 }, // i2 status
        { responsivePriority: 14, targets: 12 } // budget start date
      ],
      dom: '<"dt-controls"l<"ml-auto"fB<"d-inline-block"p>>>rt<"dt-controls"<"mr-auto"i>p>',
      buttons: [
        {
          extend: 'excel',
          className: 'btn-excel',
          titleAttr: 'Excel export',
          text: 'Export',
          filename: 'fs-fp-grants-search-result',
          title: null,
          header: true,
          exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] }
        }
      ],
      rowCallback: (row: Node, data: any[] | object, index: number) => {
        // Fix for Excel output - I removed empty renderers in column definitions
        // But now, I have to remove the first "text" child node to prevent it
        // from rendering (angular datatables bug)
        this.dtOptions.columns.forEach((column, ind) => {
          if (column.ngTemplateRef) {
            const cell = row.childNodes.item(ind);
            if (cell.childNodes.length > 1) { // you have to leave at least one child node
              $(cell.childNodes.item(0)).remove();
            }
          }
        });
      }
    };

    setTimeout(() => this.dtTrigger.next(), 0);
  }

  /**
   * User/system selects FOA numer from the drop down
   * @param $event
   */
  onRfaPaChangeSelection($event: string | string[]): void {
    const rfapa: string = ($event instanceof Array) ? $event[0] : $event;
    const id = this.searchCriteria.getIndex(rfapa);
    //console.log('*** on rfa pa change selection ', $event, this.searchCriteria.rfaPaEntries[id].selectedNcabDates);
    const selectedNcabs = this.searchCriteria.onChangeRfaPaEntry(rfapa, id);
  }

  /**
   * Init searchCriteria and table data from planModel
   * if it's not empty.
   * Otherwise, initialize them
   * @param grantsSearchCriteria
   * @private
   */
  private _restoreFromModel(): void {
    this.searchCriteria.rfaPaEntries = [];
    if (this.planModel.grantsSearchCriteria != null && this.planModel.grantsSearchCriteria.length > 0) {
      for (const criteria of this.planModel.grantsSearchCriteria) {
        const entry: RfaPaEntry = new RfaPaEntry(this.searchCriteria);
        entry.rfaPaNumber = criteria.rfaPaNumber;
        this.searchCriteria.rfaPaEntries.push(entry);
        entry.delayedSelectedNcabs = criteria.ncabDates;
        this.logger.debug('_restoreFromModel', entry.selectedNcabDates);
      }
      this.canDeactivate = false;
    } else {
      this.searchCriteria.rfaPaEntries.push(new RfaPaEntry(this.searchCriteria));
    }

    // Restore or init table results data
    if (this.planModel.allGrants != null && this.planModel.allGrants.length > 0) {
      this.dtData = this.planModel.allGrants;
    } else {
      this.dtData = [];
    }
  }

  /**
   * ACTION: click on select checkbox inside Results table
   * Updates the appropriate entry in dtData and
   * makes Select Grants button enabled/disabled depending on
   * selection existence
   */
  onCaptureSelectedEvent(event: SelectGrantCheckboxEventType) {
    for (const entry of this.dtData) {
      if (entry.applId === event.applId) {
        entry.selected = event.selected;
        break;
      }
    }
    this.grantSelectionTooltip();
    // when grants selection is changed, disable links to other steps to force the use of
    // save and continue to navigate.
    this.navigationModel.disableStepLinks(2, 6);
  }

  grantSelectionTooltip(): void {
    let hasSelected = false;
    if (this.dtData && this.dtData.length > 0) {
      for (const entry of this.dtData) {
        if (entry.selected) {
          hasSelected = true;
          break;
        }
      }
    }
    this.cannotSelectGrantsTooltip = (hasSelected) ? null : 'No grants selected for Funding Plan';
  }

  /**
   * ACTION: click on Minus button to remove FOA search Criteria line
   *
   */
  removeRfaPa(index: number): void {
    this.searchCriteria.rfaPaEntries.splice(index, 1);
    this.searchCriteria.validateForRfaPaDuplicate();
    if (this.searchCriteria.errActivityCodes.length > 0) {
      this.searchCriteria.validateForActivityCodes();
    }
  }

  /**
   * ACTION: click on Plus button to add FOA search Criteria
   *
   */
  appendRfaPa(): void {
    this.searchCriteria.rfaPaEntries.push(new RfaPaEntry(this.searchCriteria));
  }

  /**
   * ACTION: click on Clear button
   *
   * Resets search criteria and results table
   * Resets data model
   * Disables SelectGrants button
   */
  clear(): void {
    this.searchCriteria.rfaPaEntries = [];
    this.searchCriteria.rfaPaEntries.push(new RfaPaEntry(this.searchCriteria));
    this.searchCriteria.errActivityCodes = [];
    this.canDeactivate = true;
    this.noSelectableGrants = false;
    this.noSelectableGrantsWarining = '';

    // Reset results
    this.dtData = [];
    this.dtOptions.data = this.dtData;
    if (this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.destroy();
        this.dtTrigger.next();
      });
    }
    this.resetModel();
    this.grantSelectionTooltip();
    this.navigationModel.disableStepLinks(2, 6);
  }

  /**
   * ACTION: click on Search button
   *
   * Invokes a grants search
   * Resets
   * and navigates to step 2
   */
  search(): void {
    this.searchCriteria.validateForRfaPaDuplicate();
    this.searchCriteria.validateForRequired();
    this.searchCriteria.validateForActivityCodes();
    if (this.searchCriteria.isValid()) {

      const criteria: FundingPlanGrantSearchCriteria = {};
      criteria.rfaPaNcabDates = this._cloneToRfaPaNcabDates();

      this.fsPlanControllerService.searchFundingPlanGrantsUsingPOST(criteria).subscribe(
        (result: GrantsSearchResultDatatableDto) => {
          this.dtData = result.data;
          this._calculateNotSelectableRfaPasFlags(result.data);
          this.grantSelectionTooltip();
          this.navigationModel.disableStepLinks(2, 6); // disable steps after new search
          this.dtOptions.data = this.dtData;

          // RESET plan model on every search
          // mark model dirty on every search
          this.resetModel();
          this.planModel.grantsSearchCriteria = this._cloneToRfaPaNcabDates();
          this.canDeactivate = false;

          if (this.dtElement.dtInstance) {
            this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
              dtInstance.destroy();
              this.dtTrigger.next();
            });
          }
        },
        error => {
          this.logger.error('HttpClient get request error for----- ' + error.message);
        });
    }
  }

  /**
   * ACTION: click on Search Grants button
   *
   * Saves the selection results in planModel
   * and navigates to step 2
   */
  selectGrants(): void {
    for (const entry of this.dtData) {
      if (entry.selected) {
      }
    }
    // save selections in planModel
    this.planModel.allGrants = this.dtData;
    this.canDeactivate = true;
    this.planModel.fundingPlanDto.planFy = getCurrentFiscalYear();
    this.router.navigate(['/plan/step2']);

  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }

  resetModel(): void {
    this.planModel.reset();
  }

  /**
   * Extracts selected entries from SearchCriteria and
   * and returns array of extracted entries
   * @private
   */

  private _cloneToRfaPaNcabDates(): Array<RfaPaNcabDate> {
    const ret = new Array<RfaPaNcabDate>();
    for (const rfa of this.searchCriteria.rfaPaEntries) {
      ret.push({
        rfaPaNumber: rfa.rfaPaNumber,
        ncabDates: Object.assign([], rfa.getNcabDates())
      });
    }
    return ret;
  }

  private _calculateNotSelectableRfaPasFlags(data: Array<NciPfrGrantQueryDtoEx>) {
    const rfaList: Array<RfaPaNcabDate> = this._cloneToRfaPaNcabDates();
    this.noSelectableGrants = true;

    data.forEach((value) => {
      value.selected = false;
      if (!value.notSelectableReason || value.notSelectableReason.length == 0) { // can be selected
        this.noSelectableGrants = false;
        let i = rfaList.length;
        while (i--) {
          if (rfaList[i].rfaPaNumber === value.rfaPaNumber) {
            let j = rfaList[i].ncabDates.length;
            while (j--) {
              if (rfaList[i].ncabDates[j] === value.councilMeetingDate) {
                rfaList[i].ncabDates.splice(j, 1);
              }
            }
            if (rfaList[i].ncabDates.length == 0) {
              rfaList.splice(i, 1);
            }
          }
        }
      }
    });
    this.noSelectableGrantsWarining = '';
    if (!this.noSelectableGrants) {
      for (const rfa of rfaList) {
        for (const ncab of rfa.ncabDates) {
          if (this.noSelectableGrantsWarining.length > 0) {
            this.noSelectableGrantsWarining += '<br>';
          }
          this.noSelectableGrantsWarining += 'Warning: No selectable grant applications exists for <b>' + rfa.rfaPaNumber + '</b> for <b>' + this._getFormattedNcab(rfa.rfaPaNumber, ncab, data) + '</b>';
        }
      }
    }
  }

  private _getFormattedNcab(rfapa: string, ncab: string, data: Array<NciPfrGrantQueryDtoEx>) : string {
    for (const entry of data) {
      if (entry.rfaPaNumber === rfapa && entry.councilMeetingDate === ncab) {
        return entry.formattedCouncilMeetingDate;
      }
    }
    return ncab;
  }
}
