import {AfterViewInit, Component, OnInit, TemplateRef, ViewChild} from '@angular/core';
import { Options } from 'select2';
import {Select2OptionData} from "ng-select2";
import {FsPlanControllerService, FundingPlanRfaPaDto, NciPfrGrantQueryDto, RfaPaNcabDate} from '@nci-cbiit/i2ecws-lib';
import {NGXLogger} from "ngx-logger";
import {FundingPlanNcabDto} from "@nci-cbiit/i2ecws-lib/model/fundingPlanNcabDto";
import {Subject} from "rxjs";
import {FullGrantNumberCellRendererComponent} from "../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component";
import {CancerActivityCellRendererComponent} from "../../table-cell-renderers/cancer-activity-cell-renderer/cancer-activity-cell-renderer.component";
import {ExistingRequestsCellRendererComponent} from "../../table-cell-renderers/existing-requests-cell-renderer/existing-requests-cell-renderer.component";
import {PlanModel} from "../../model/plan/plan-model";
import {FundingPlanGrantSearchCriteria} from "@nci-cbiit/i2ecws-lib/model/fundingPlanGrantSearchCriteria";
import {GrantsSearchResultDatatableDto} from "@nci-cbiit/i2ecws-lib/model/grantsSearchResultDatatableDto";
import {DataTableDirective} from "angular-datatables";
import {SelectGrantCheckboxCellRendererComponent} from "./select-grant-checkbox-cell-renderer/select-grant-checkbox-cell-renderer.component";
import {SelectGrantCheckboxEventType} from "./select-grant-checkbox-cell-renderer/select-grant-checkbox-event-type";

interface NciPfrGrantQueryDtoEx extends NciPfrGrantQueryDto {
  selected ?: boolean;
}

class NcabError {
  constructor(planId: number, ncab: string) {
    this.planId = planId;
    this.ncab = ncab;
  }
  planId: number;
  ncab: string;
}

/**
 * Data representation of each row for Rfa Pa dropdown and NCAB dates dropdown
 */
class RfaPaEntry {
  selectedNcabDates: string[] | string = [];
  rfaPaNumber: string = '';
  availableNcabDates: Array<Select2OptionData> = [];
  parent: FundingPlanGrantsSearchCriteriaUI;
  ncabErrors: Array<NcabError> = [];
  rfaErrDuplcated: boolean = false;
  rfaErrRequired: boolean = false;
  ncabErrRequired: boolean = false;

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

  onRfaPaChangeSelection($event: string | string[]): void {
    const id = this._getIndex();
    const rfapa: string = ($event instanceof Array) ? $event[0] : $event;
    this.parent.onChangeRfaPaEntry(rfapa, id);
  }

  _getIndex(): number {
    for (let i = 0; i < this.parent.rfaPaEntries.length; i++) {
      if (this === this.parent.rfaPaEntries[i]) {
        return i;
      }
    }
    return -1;
  }

  onNcabChangeSelection($event: string | string[]) {
    console.log('On Change NCAB Selection value: ', $event)
    // validation
    this.ncabErrors = [];
    if ($event instanceof Array) {
      for (let ncab of $event) {
        let dto: FundingPlanNcabDto = this._findNcabDto(ncab);
        if (dto != null
            && dto.currentPlanStatus != null
            && dto.currentPlanStatus != 'COMPLETED'
            && dto.currentPlanStatus != 'REJECTED'
            && dto.currentPlanStatus != 'CANCELLED') {
          this.ncabErrors.push(new NcabError(dto.fprId, dto.formattedCouncilMeetingDate));
        }
      }
    }
    // reset 'ncab required' error
    const id = this._getIndex();
    this.parent.rfaPaEntries[id].ncabErrRequired = false;
  }

  _findNcabDto(ncab: string): FundingPlanNcabDto {
    for (let entry of this.availableNcabDates) {
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
    this.rfaPaEntries.push(new RfaPaEntry(this))
  }

  public onChangeRfaPaEntry(rfaPa: string, index: number) : void {
    const entry = this.rfaPaEntries[index];
    entry.selectedNcabDates = [];
    entry.rfaErrRequired = false;
    entry.ncabErrRequired = false;
    if (this.ncabMap.has(rfaPa)) {
      entry.availableNcabDates = this.ncabMap.get(rfaPa);
    } else {
      entry.availableNcabDates = [];
    }
    this.validateForRfaPaDuplicate();
    if (this.errActivityCodes.length > 0) {
      this.validateForActivityCodes();
    }
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
    for (let entry of this.rfaPaEntries) {
      if (!entry.rfaPaNumber || entry.rfaPaNumber.length == 0) {
        entry.rfaErrRequired = true;
      }
      if (!entry.selectedNcabDates || entry.selectedNcabDates.length == 0) {
        entry.ncabErrRequired = true;
      }
    }
  }

  // Validate for activity codes
  public validateForActivityCodes() : boolean {
    const valid = this._validateForActivityCodes();
    const errs = [];
    if (!valid) {
      for (let entry of this.rfaPaEntries) {
        if (entry.rfaPaNumber && entry.rfaPaNumber.length > 0) {
          errs.push(entry.rfaPaNumber + ': ' + this.activityCodesMap.get(entry.rfaPaNumber));
        }
      }
    }
    this.errActivityCodes = errs;
    return valid;
  }

  _validateForActivityCodes() : boolean {
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
    for (let entry of this.rfaPaEntries) {
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
export class PlanStep1Component implements OnInit, AfterViewInit {

  constructor(
    private fsPlanControllerService: FsPlanControllerService,
              private planModel: PlanModel,
              private logger: NGXLogger) { }

  @ViewChild(DataTableDirective, {static: false}) dtElement: DataTableDirective;
  @ViewChild('selectGrantCheckboxRenderer') selectGrantCheckboxRenderer: TemplateRef<SelectGrantCheckboxCellRendererComponent>;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;
  @ViewChild('cancerActivityRenderer') cancerActivityRenderer: TemplateRef<CancerActivityCellRendererComponent>;
  @ViewChild('existingRequestsRenderer') existingRequestsRenderer: TemplateRef<ExistingRequestsCellRendererComponent>;

  ncab_options: Options;
  searchCriteria: FundingPlanGrantsSearchCriteriaUI;

  grantViewerUrl: string = this.planModel.grantViewerUrl;
  eGrantsUrl: string = this.planModel.eGrantsUrl;

  dtTrigger: Subject<any> = new Subject();
  dtOptions: any = {};
  dtData: Array<NciPfrGrantQueryDtoEx> = [];
  noSelectableGrants: boolean = false;

  ngOnInit(): void {
    this.ncab_options = {
      multiple: true,
      allowClear: false
    };

    this.searchCriteria = new FundingPlanGrantsSearchCriteriaUI();
    this.logger.debug('About to subscribe to getRfaPaListUsingGET');
    this.fsPlanControllerService.getRfaPaListUsingGET().subscribe(
      (result: Array<FundingPlanRfaPaDto>) => {
        this.logger.debug('getRfaPaListUsingGET:', result);
        const tmp: Array<Select2OptionData> = [];
        let index = 0;
        for (let entry of result) {
          index = index + 1;
          if (entry.rfaPaNumber && entry.rfaPaNumber.length > 0) {
            tmp.push({
              id: entry.rfaPaNumber,
              text: entry.rfaPaNumber
            });
            const ncabTmp: Array<Select2OptionData> = [];
            for (let ncabEntry of entry.ncabs) {
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
      },
      error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });

  }

  ngAfterViewInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 25,
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
        {title: 'Sel', data: 'selected', ngTemplateRef: { ref: this.selectGrantCheckboxRenderer}, className: 'all'}, //0
        {title: 'Grant Number', data: 'fullGrantNum', ngTemplateRef: { ref: this.fullGrantNumberRenderer}, className: 'all'}, //1
        {title: 'PI', data: 'piFullName', render: ( data, type, row, meta ) => { //2
            return '<a href="mailto:' + row.piEmail + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }, className: 'all'},
        {title: 'Project Title', data: 'projectTitle'}, //3
        {title: 'RFA/PA', data: 'rfaPaNumber', render: ( data, type, row, meta ) => { //4
            return '<a href="' + row.nihGuideAddr + '" target="blank" >' + data + '</a>';
          }},
        {title: 'I2 Status', data: 'applStatusGroupDescrip'}, //5
        {title: 'PD', data: 'pdFullName', render: ( data, type, row, meta ) => { //6
            return '<a href="mailto:' + row.pdEmailAddress + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }},
        {title: 'CA', data: 'cayCode', ngTemplateRef: { ref: this.cancerActivityRenderer}, className: 'all'}, //7
        {title: 'FY', data: 'fy'}, //8
        {title: 'NCAB', data: 'councilMeetingDate', defaultContent: '', render: ( data, type, row, meta) => { //9
            return (data) ? data.substr(4, 2) + '/' + data.substr(0, 4) : '';
          }},
        {title: 'Pctl', data: 'irgPercentileNum'}, //10
        {title: 'PriScr', data: 'priorityScoreNum'}, //11
        {title: 'Budget Start Date', data: 'budgetStartDate'}, //12
        {title: 'Existing Requests', data: 'requestCount', //13
          ngTemplateRef: { ref: this.existingRequestsRenderer}, className: 'all'},
        {data: null, defaultContent: ''}
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
        {orderable: false, targets: 0 }, // check box
        {responsivePriority: 1, targets: 1 }, // grant_num
        {responsivePriority: 3, targets: 2 }, // pi
        {responsivePriority: 4, targets: 9 }, // ncab
        {responsivePriority: 5, targets: 8 }, // fy
        {responsivePriority: 6, targets: 6 }, // pd
        {responsivePriority: 7, targets: 7 }, // ca
        {responsivePriority: 8, targets: 10 }, // pctl
        {responsivePriority: 9, targets: 11 }, // priscr
        {responsivePriority: 10, targets: 4 }, // rfa/pa
        {responsivePriority: 11, targets: 13 }, // existing requests
        {responsivePriority: 12, orderable: false, targets: 3 }, // project title
        {responsivePriority: 13, targets: 5 }, // i2 status
        {responsivePriority: 14, targets: 12 } // budget start date
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
          exportOptions: { columns: [ 1, 2, 3, 4 , 5 , 6, 7, 8, 9, 10, 11, 12, 13 ] }
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
    }

    setTimeout(() => this.dtTrigger.next(), 0);
  }

  onCaptureSelectedEvent(event: SelectGrantCheckboxEventType) {
    this.logger.debug('onCaptureSelectedEvent', event);
    for (let entry of this.dtData) {
      if (entry.applId === event.applId) {
        entry.selected = event.selected;
        return;
      }
    }
  }

  removeRfaPa(index: number) {
    this.logger.debug('removeRfaPa ', index);
    this.searchCriteria.rfaPaEntries.splice(index, 1);
    this.searchCriteria.validateForRfaPaDuplicate();
    if (this.searchCriteria.errActivityCodes.length > 0) {
      this.searchCriteria.validateForActivityCodes();
    }
  }

  appendRfaPa() {
    this.searchCriteria.rfaPaEntries.push(new RfaPaEntry(this.searchCriteria));
  }

  clear() {
    this.searchCriteria.rfaPaEntries = [];
    this.searchCriteria.rfaPaEntries.push(new RfaPaEntry(this.searchCriteria));
    this.searchCriteria.errActivityCodes = [];
  }

  search() {
    this.searchCriteria.validateForRfaPaDuplicate();
    this.searchCriteria.validateForRequired();
    this.searchCriteria.validateForActivityCodes();
    if (this.searchCriteria.isValid()) {

      const criteria: FundingPlanGrantSearchCriteria = {};
      criteria.rfaPaNcabDates = new Array<RfaPaNcabDate>();
      for (const rfa of this.searchCriteria.rfaPaEntries) {
        criteria.rfaPaNcabDates.push({
          rfaPaNumber: rfa.rfaPaNumber,
          ncabDates: rfa.getNcabDates()
        });
      }
      this.fsPlanControllerService.searchFundingPlanGrantsUsingPOST(criteria).subscribe(
        (result: GrantsSearchResultDatatableDto) => {
          this.dtData = result.data;
          this.noSelectableGrants = true;
          this.dtData.forEach((value) => {
            value.selected = false;
            if (!value.notSelectableReason || value.notSelectableReason.length == 0) {
              this.noSelectableGrants = false;
            }
          });
          this.dtOptions.data = this.dtData;

//          this.dtTrigger.next();
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

  selectGrants(): void {
    this.logger.debug('selectGrants');
    for (let entry of this.dtData) {
      if (entry.selected) {
        this.logger.debug('Selected grant ', entry.fullGrantNum);
      }
    }
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }

}
