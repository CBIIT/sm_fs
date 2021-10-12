import {AfterViewInit, Component, OnDestroy, OnInit, QueryList, TemplateRef, ViewChild, ViewChildren} from '@angular/core';
import { FundSelectSearchCriteria, FsSearchControllerService, FundingRequestQueryDatatableDto, FundingRequestQueryDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import {Subject} from "rxjs";
import {AppPropertiesService} from "../../service/app-properties.service";
import {LoaderService} from "../../service/loader-spinner.service";
import {DataTableDirective} from "angular-datatables";
import {FullGrantNumberCellRendererComponent} from "../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component";
import {CancerActivityCellRendererComponent} from "../../table-cell-renderers/cancer-activity-cell-renderer/cancer-activity-cell-renderer.component";
import {SelectFundingRequestCheckboxCellRendererComponent} from "./select-funding-request-checkbox-cell-renderer/select-funding-request-checkbox-cell-renderer.component";
import {SearchFundingRequestActionCellRendererComponent} from "./search-funding-request-action-cell-renderer/search-funding-request-action-cell-renderer.component";
import {FundingPlanQueryDto} from "@nci-cbiit/i2ecws-lib/model/fundingPlanQueryDto";
import {SearchFundingPlanFoasCellRendererComponent} from "./search-funding-plan-foas-cell-renderer/search-funding-plan-foas-cell-renderer.component";
import {Router} from "@angular/router";
import { BatchApproveService } from '../batch-approve/batch-approve.service';
import { BatchApproveModalComponent } from '../batch-approve/batch-approve-modal.component';

class DataTablesResponse {
  data: any[];
  draw: number;
  recordsFiltered: number;
  recordsTotal: number;
}

@Component({
  selector: 'app-search-result',
  templateUrl: './search-result.component.html',
  styleUrls: ['./search-result.component.css']
})
export class SearchResultComponent implements OnInit, AfterViewInit, OnDestroy {

  constructor(private fsSearchControllerService: FsSearchControllerService,
              private propertiesService: AppPropertiesService,
              private loaderService: LoaderService,
              private router: Router,
              private batchApproveService: BatchApproveService,
              private logger: NGXLogger) { }

  @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;

  @ViewChild('selectFundingRequestCheckboxRenderer') selectFundingRequestCheckboxRenderer: TemplateRef<SelectFundingRequestCheckboxCellRendererComponent>;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;
  @ViewChild('cancerActivityRenderer') cancerActivityRenderer: TemplateRef<CancerActivityCellRendererComponent>;
  @ViewChild('searchFundingPlanFoasRenderer') searchFundingPlanFoasRenderer: TemplateRef<SearchFundingPlanFoasCellRendererComponent>;
  @ViewChild('searchFundingRequestActionRenderer') searchFundingRequestActionRenderer: TemplateRef<SearchFundingRequestActionCellRendererComponent>;

  @ViewChild('selectFundingPlanCheckboxRenderer') selectFundingPlanCheckboxRenderer: TemplateRef<SelectFundingRequestCheckboxCellRendererComponent>;
  @ViewChild('searchFundingPlanActionRenderer') searchFundingPlanActionRenderer: TemplateRef<SearchFundingRequestActionCellRendererComponent>;
  @ViewChild(BatchApproveModalComponent) batchApproveModal: BatchApproveModalComponent;
  // dtOptions: DataTables.Settings = {};

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  eGrantsUrl: string = this.propertiesService.getProperty('EGRANTS_URL');

  dtFundingRequestOptions: any = {};
  dtFundingPlanOptions: any = {};
  dtFundingRequestTrigger: Subject<any> = new Subject();
  dtFundingPlanTrigger: Subject<any> = new Subject();

  fundingRequests: FundingRequestQueryDto[];
  fundingPlans: FundingPlanQueryDto[];
  searchCriteria: FundSelectSearchCriteria;

  noFundingRequestResult: boolean = true;
  noFundingPlanResult: boolean = true;
  filterTypeLabel: string;

  selectedRows: Map<number, any> = new Map<number, any>();

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.dtFundingRequestOptions = {
      pagingType: 'full_numbers',
      pageLength: 100,
      serverSide: true,
      processing: false,
      destroy: true,
      language: {
        paginate: {
          first: '<i class="far fa-chevron-double-left" title="First"></i>',
          previous: '<i class="far fa-chevron-left" title="Previous"></i>',
          next: '<i class="far fa-chevron-right" title="Next"></i>',
          last: '<i class="far fa-chevron-double-right" Last="First"></i>'
        }
      },
      ajax: (dataTablesParameters: any, callback) => {
        if (!this.searchCriteria) {
          this.noFundingRequestResult = true;
          callback({
            recordsTotal: 0,
            recordsFiltered: 0,
            data: []
          });
          return;
        }

        this.loaderService.show();
        this.searchCriteria.params = dataTablesParameters;
        this.logger.debug('Search for Funding Requests parameters:', this.searchCriteria);
        this.fsSearchControllerService.searchFundingRequestsUsingPOST(
          this.searchCriteria).subscribe(
          result => {
            this._populateSelectedIntoResults('frqId', result.data);
            // this.logger.debug('Search Funding Requests result: ', result);
            this.fundingRequests = result.data;
            this.noFundingRequestResult = result.recordsTotal <= 0;
            callback({
              recordsTotal: result.recordsTotal,
              recordsFiltered: result.recordsFiltered,
              data: result.data
            });
            this.loaderService.hide();
          }, error => {
            this.logger.error('HttpClient get request error for----- ' + error.message);
            this.noFundingRequestResult = true;
            callback({
              recordsTotal: 0,
              recordsFiltered: 0,
              data: []
            });
            alert(error.message);
          });
      },
      columns: [
        {title: 'Sel', data: 'selected', orderable: false, ngTemplateRef: { ref: this.selectFundingRequestCheckboxRenderer }, className: 'all' }, // 0
        {title: 'Grant Number', data: 'fullGrantNum', ngTemplateRef: { ref: this.fullGrantNumberRenderer}, className: 'all'}, // 1
        {title: 'PI', data: 'piFullName', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : '<a href="mailto:' + row.piEmail + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }, className: 'all'}, // 2
        {title: 'Project Title', data: 'projectTitle'}, // 3
        {title: 'I2 Status', data: 'applStatusGroupDescrip'}, // 4
        {title: 'PD', data: 'pdFullName', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : '<a href="mailto:' + row.pdEmailAddress + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }}, // 5
        {title: 'CA', data: 'cayCode', ngTemplateRef: { ref: this.cancerActivityRenderer}, className: 'all'}, // 6
        {title: 'FY', data: 'fy'}, // 7
        {title: 'Request ID', data: 'frqId'}, // 8
        {title: 'Request Name', data: 'requestName'}, // 9
        {title: 'Request Type', data: 'requestType'}, // 10
        {title: 'Requesting DOC Approver', data: 'requestingDocApprvlFullName', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : '<a href="mailto:' + row.requestingDocApprvlEmail + '?subject=' + row.fullGrantNum + ' - ' + row.requestingDocApprvlFullName + '">' + data + '</a>';
          }}, // 11
        {title: 'Final LOA', data: 'loaName'}, // 12
        {title: 'Funding Approvals', data: 'fundsCertificationCode'}, // 13
        {title: 'Status', data: 'currentStatusDescrip'}, // 14
        {title: 'Last Action Date', data: 'requestStatusDate'}, // 15
        {
          title: 'Action', data: null, defaultContent: 'Select'
          ,ngTemplateRef: { ref: this.searchFundingRequestActionRenderer}, className: 'all'
        }, // 16
        {data: null, defaultContent: ''}

      ],
      order: [[8, 'asc']],
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
        {responsivePriority: 1, targets: 1 }, // grant_num
        {responsivePriority: 2, targets: 16 }, // action
        {responsivePriority: 3, targets: 2 }, // pi
        {responsivePriority: 5, targets: 7 }, // fy
        {responsivePriority: 6, targets: 5 }, // pd
        {responsivePriority: 7, targets: 6 }, // ca
        {responsivePriority: 8, targets: 14 }, // status
        {responsivePriority: 9, targets: 10 }, // request type
        {responsivePriority: 10, targets: 8 }, // reuest id
        {responsivePriority: 11, targets: 9 }, // request name
        {responsivePriority: 12, targets: 12 }, // final loa
        {responsivePriority: 13, targets: 11 }, // requesting doc approver
        {responsivePriority: 13, targets: 13 }, // funding approvals
        {responsivePriority: 13, targets: 4 }, // i2 status
        {responsivePriority: 14, targets: 3 } // project title
      ],
      dom: '<"dt-controls dt-top"l<"ml-4"i><"ml-auto"fB<"d-inline-block"p>>>rt<"dt-controls"<"mr-auto"i>p>',
      buttons: [
        {
          extend: 'excel',
          className: 'btn-excel',
          titleAttr: 'Excel export',
          text: 'Export',
          filename: 'fs-funding-requests-search-result',
          title: null,
          header: true,
          exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] }
        }
      ],
      rowCallback: (row: Node, data: any[] | object, index: number) => {
        // Fix for Excel output - I removed empty renderers in column definitions
        // But now, I have to remove the first "text" child node to prevent it
        // from rendering (angular datatables bug)
        this.dtFundingRequestOptions.columns.forEach((column, ind) => {
          if (column.ngTemplateRef) {
            const cell = row.childNodes.item(ind);
            if (cell.childNodes.length > 1) { // you have to leave at least one child node
              $(cell.childNodes.item(0)).remove();
            }
          }
        });
      }
    };

    this.dtFundingPlanOptions = {
      pagingType: 'full_numbers',
      pageLength: 100,
      serverSide: true,
      processing: false,
      destroy: true,
      language: {
        paginate: {
          first: '<i class="far fa-chevron-double-left" title="First"></i>',
          previous: '<i class="far fa-chevron-left" title="Previous"></i>',
          next: '<i class="far fa-chevron-right" title="Next"></i>',
          last: '<i class="far fa-chevron-double-right" Last="First"></i>'
        }
      },
      ajax: (dataTablesParameters: any, callback) => {
        if (!this.searchCriteria) {
          this.noFundingPlanResult = true;
          callback({
            recordsTotal: 0,
            recordsFiltered: 0,
            data: []
          });
          return;
        }

        this.loaderService.show();
        this.searchCriteria.params = dataTablesParameters;
        this.logger.debug('Search Funding Plans parameters:', this.searchCriteria);
        this.fsSearchControllerService.searchFundingPlansUsingPOST(
          this.searchCriteria).subscribe(
          result => {
            this._populateSelectedIntoResults('fprId', result.data);
            // this.logger.debug('Search Funding Requests result: ', result);
            this.fundingPlans = result.data;
            this.noFundingPlanResult = result.recordsTotal <= 0;
            callback({
              recordsTotal: result.recordsTotal,
              recordsFiltered: result.recordsFiltered,
              data: result.data
            });
            this.loaderService.hide();
            setTimeout(() => {  // FIXED ISSUE WITH TABLE RESIZING
                this.dtElements.forEach((dtEl: DataTableDirective) => {
                  if (dtEl.dtInstance) {
                    dtEl.dtInstance.then((dtInstance: DataTables.Api) => {
                      dtInstance.columns.adjust();
                    });
                  }
                });
            }, 0)
          }, error => {
            this.logger.error('HttpClient get request error for----- ' + error.message);
          });
      },
      columns: [
        {title: 'Sel', data: 'selected', orderable: false, ngTemplateRef: { ref: this.selectFundingPlanCheckboxRenderer }, className: 'all' }, // 0
        {title: 'FOA information', data: 'fpFoasList', orderable: false,
          ngTemplateRef: { ref: this.searchFundingPlanFoasRenderer },className: 'all'}, // 1
        {title: 'Plan ID', data: 'fprId'}, // 2
        {title: 'Plan Name', data: 'planName'}, // 3
        {title: 'Requesting PD & DOC', data: 'requestorPdFullName', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : '<a href="mailto:' + row.requestorEmailAddress + '?subject=' + row.planName + ' - ' + row.requestorPdFullName + '">' + data + '</a>';
          }}, // 4
        {title: 'Requesting DOC Approver', data: 'requestingDocApprvlFullName', render: ( data, type, row, meta ) => { //TODO
            return (!data || data == null) ? '' : '<a href="mailto:' + row.requestingDocApprvlEmail + '?subject=' + row.planName + ' - ' + row.requestingDocApprvlFullName + '">' + data + '</a>';
          }}, // 5
        {title: 'Final LOA', data: 'loaName'}, // 6
        {title: 'Funding Approvals', data: 'fundsCertificationCode'}, // 7
        {title: 'Program Recomm. Direct Costs', data: 'directRecommendedAmt'}, // 8  //TODO
        {title: 'Program Recomm. Total Costs', data: 'totalRecommendedAmt'}, // 9
        {title: 'Status', data: 'currentStatusDescrip'}, // 10
        {title: 'Last Action Date', data: 'planStatusDate'}, // 11
        {
          title: 'Action', data: null, defaultContent: 'Select'
          ,ngTemplateRef: { ref: this.searchFundingPlanActionRenderer}, className: 'all'
        }, // 12
        {data: null, defaultContent: ''}

      ],
      order: [[3, 'asc']],
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
        {responsivePriority: 1, targets: 1 }, // rfa/pa info
        // {responsivePriority: 2, targets: 12 }, // action
        {responsivePriority: 3, targets: 2 }, // plan id
        {responsivePriority: 5, targets: 4 }, // requesting pd & doc
        {responsivePriority: 6, targets: 5 }, // requesting doc approver
        {responsivePriority: 7, targets: 10 }, // status
        {responsivePriority: 8, targets: 11 }, // last action date
        {responsivePriority: 9, targets: 3 }, // plan name
        {responsivePriority: 10, targets: 6 }, // final LOA
        {responsivePriority: 11, targets: 7 }, // funding approvals
        {responsivePriority: 12, targets: 9 }, // program recomm. Total Costs
        {responsivePriority: 13, targets: 8 } // program recomm. Direct Costs
      ],
      dom: '<"dt-controls dt-top"l<"ml-4"i><"ml-auto"fB<"d-inline-block"p>>>rt<"dt-controls"<"mr-auto"i>p>',
      buttons: [
        {
          extend: 'excel',
          className: 'btn-excel',
          titleAttr: 'Excel export',
          text: 'Export',
          filename: 'fs-funding-requests-search-result',
          title: null,
          header: true,
          exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] } //TODO
        }
      ],
      rowCallback: (row: Node, data: any[] | object, index: number) => {
        // Fix for Excel output - I removed empty renderers in column definitions
        // But now, I have to remove the first "text" child node to prevent it
        // from rendering (angular datatables bug)
        this.dtFundingPlanOptions.columns.forEach((column, ind) => {
          if (column.ngTemplateRef) {
            const cell = row.childNodes.item(ind);
            if (cell.childNodes.length > 1) { // you have to leave at least one child node
              $(cell.childNodes.item(0)).remove();
            }
          }
        });
      }
    };

    this.selectedRows.clear();
  }


  ngOnDestroy(): void {
    this.dtFundingRequestTrigger.unsubscribe();
    this.dtFundingPlanTrigger.unsubscribe();
  }

  doFundingRequestSearch(criteria: FundSelectSearchCriteria, filterTypeLabel: string): void {
    this.searchCriteria = criteria;
    this.noFundingPlanResult = true;
    this.noFundingRequestResult = false;
    this.filterTypeLabel = filterTypeLabel;
    this.selectedRows.clear();
    this._triggerDtInstance(this.dtFundingRequestTrigger);
  }

  doFundingPlanSearch(criteria: FundSelectSearchCriteria, filterTypeLabel: string): void {
    this.searchCriteria = criteria;
    this.noFundingRequestResult = true;
    this.noFundingPlanResult = false;
    this.filterTypeLabel = filterTypeLabel;
    this.selectedRows.clear();
    this._triggerDtInstance(this.dtFundingPlanTrigger);
  }

  _triggerDtInstance(trigger: Subject<any>): void {
    this.dtElements.forEach((dtEl: DataTableDirective) => {
      if (dtEl.dtTrigger === trigger) {
        if (dtEl.dtInstance) {
          dtEl.dtInstance.then((dtInstance: DataTables.Api) => {
            dtInstance.clear();
            setTimeout(() => trigger.next(), 0);
          });
        }
        else {
          trigger.next();
        }
      }
      else if (dtEl.dtInstance) {
        dtEl.dtInstance.then((dtInstance: DataTables.Api) => {
          dtInstance.clear();
        });
      }
    });

  }

  onCaptureFRSelectedEvent($event: any) {
    if ($event.frqId) {
      if ($event.selected) {
        this.selectedRows.set($event.frqId, $event);
      }
      else {
        this.selectedRows.delete($event.frqId);
      }
      console.debug('onCaptureFRSelectedEvent', this.selectedRows);
    }
  }

  onCaptureFPSelectedEvent($event: any) {
    if ($event.fprId) {
      if ($event.selected) {
        this.selectedRows.set($event.fprId, $event);
      }
      else {
        this.selectedRows.delete($event.fprId);
      }
      console.debug('onCaptureFPSelectedEvent', this.selectedRows);
    }
  }

  private _populateSelectedIntoResults(id: string, data: Array<any>): void {
    if (data) {
      for (const entry of data) {
        entry.selected = this.selectedRows.has(entry[id]);
      }
    }
  }

  onOpenFundingRequest($event: any) {
    this.router.navigate(['request/retrieve', $event.frqId]);
  }

  onOpenFundingPlan($event: any) {
    this.router.navigate(['plan/retrieve', $event.fprId]);

  }

  canBatchApprove(): boolean {
    return this.batchApproveService.canBatchApprove();
  }

  showBatchApproveModal(): void {
    this.batchApproveModal.openModalForRequests([]).then(
      (result) => {
        this.logger.debug('Batch approve modal was submit and closed ', result);
      }
    )
      .catch(
        (reason) => {
          this.logger.debug('user dismissed batch approve confirmation modal without proceed', reason);
        }
      );
  }
}
