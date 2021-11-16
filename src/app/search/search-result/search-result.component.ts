import {AfterViewInit, Component, OnDestroy, OnInit, QueryList, TemplateRef, ViewChild, ViewChildren} from '@angular/core';
import {
  FundSelectSearchCriteria,
  FsSearchControllerService,
  FundingRequestQueryDatatableDto,
  FundingRequestQueryDto,
  JasperReportControllerService
} from '@nci-cbiit/i2ecws-lib';
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
import { FilterTypeLabels } from '../search.component';
import { DocumentService } from '../../service/document.service';
import { saveAs } from 'file-saver';
import { HttpResponse } from '@angular/common/http';
import {SearchGrantExistInRequestCellRendererComponent} from "./search-grant-exist-in-request-cell-renderer/search-grant-exist-in-request-cell-renderer.component";
import {SearchGrantExistInPlanCellRendererComponent} from "./search-grant-exist-in-plan-cell-renderer/search-grant-exist-in-plan-cell-renderer.component";
import {DatatableThrottle} from "../../utils/datatable-throttle";
import {SearchGrantExistInPaylistCellRendererComponent} from "./search-grant-exist-in-paylist-cell-renderer/search-grant-exist-in-paylist-cell-renderer.component";
import {AppUserSessionService} from "../../service/app-user-session.service";
import {CurrencyPipe} from "@angular/common";
import {convertNcabs} from "../../utils/utils";

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
              private documentService : DocumentService,
              private userService : AppUserSessionService,
              private logger: NGXLogger) { }

  @ViewChildren(DataTableDirective) dtElements: QueryList<DataTableDirective>;

  @ViewChild('selectFundingRequestCheckboxRenderer') selectFundingRequestCheckboxRenderer: TemplateRef<SelectFundingRequestCheckboxCellRendererComponent>;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;
  @ViewChild('cancerActivityRenderer') cancerActivityRenderer: TemplateRef<CancerActivityCellRendererComponent>;
  @ViewChild('searchFundingPlanFoasRenderer') searchFundingPlanFoasRenderer: TemplateRef<SearchFundingPlanFoasCellRendererComponent>;
  @ViewChild('searchFundingRequestActionRenderer') searchFundingRequestActionRenderer: TemplateRef<SearchFundingRequestActionCellRendererComponent>;

  @ViewChild('selectFundingPlanCheckboxRenderer') selectFundingPlanCheckboxRenderer: TemplateRef<SelectFundingRequestCheckboxCellRendererComponent>;
  @ViewChild('searchFundingPlanActionRenderer') searchFundingPlanActionRenderer: TemplateRef<SearchFundingRequestActionCellRendererComponent>;
  @ViewChild('existInRequestRenderer') existInRequestRenderer: TemplateRef<SearchGrantExistInRequestCellRendererComponent>;
  @ViewChild('existInPlanRenderer') existInPlanRenderer: TemplateRef<SearchGrantExistInPlanCellRendererComponent>;
  @ViewChild('existInPaylistRenderer') existInPaylistRenderer: TemplateRef<SearchGrantExistInPaylistCellRendererComponent>;
  @ViewChild(BatchApproveModalComponent) batchApproveModal: BatchApproveModalComponent;
  // dtOptions: DataTables.Settings = {};

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  eGrantsUrl: string = this.propertiesService.getProperty('EGRANTS_URL');

  dtFundingRequestOptions: any = {};
  dtFundingPlanOptions: any = {};
  dtGrantOptions: any = {};
  dtFundingRequestTrigger: Subject<any> = new Subject();
  dtFundingPlanTrigger: Subject<any> = new Subject();
  dtGrantTrigger: Subject<any> = new Subject();

  fundingRequests: FundingRequestQueryDto[];
  fundingPlans: FundingPlanQueryDto[];
  fundingGrants: any[];
  searchCriteria: FundSelectSearchCriteria;

  showFundingRequestResult: boolean = false;
  showFundingPlanResult: boolean = false;
  showGrantResult: boolean = false;

  filterTypeLabel: string;

  selectedRows: Map<number, any> = new Map<number, any>();

  batchApproveEnabled = false;
  runReportEnabled = false;

  canOpenPaylist: boolean = false;

  throttle: DatatableThrottle = new DatatableThrottle();
  // batchApproveVisible = false;

  currencyTransformer: CurrencyPipe = new CurrencyPipe('en-US');

  ngOnInit(): void {
    this.canOpenPaylist = this.userService.hasRole('GMBRCHF') ||
                          this.userService.hasRole('OEFIACRT') ||
                          this.userService.hasRole('DES') ||
                          this.userService.hasRole('PAYLSTVW');
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
        this.throttle.invoke(this, dataTablesParameters, callback, this.ajaxCallFundingRequests);
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
        {title: 'FY', data: 'requestFy'}, // 7
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
          ,ngTemplateRef: { ref: this.searchFundingRequestActionRenderer}, className: 'all', orderable: false
        }, // 16
        {data: null, defaultContent: ''}

      ],
      order: [[15, 'desc']],
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
        {responsivePriority: 8, targets: 15 }, // last action date
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
          titleAttr: 'Export Results in Current Page',
          text: 'Export Current Page',
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
        this.throttle.invoke(this, dataTablesParameters, callback, this.ajaxCallFundingPlans);
      },
      columns: [
        {title: 'Sel', data: 'selected', orderable: false, ngTemplateRef: { ref: this.selectFundingPlanCheckboxRenderer }, className: 'all' }, // 0
        {title: 'FOA information', data: 'fpFoasList', orderable: false,
          ngTemplateRef: { ref: this.searchFundingPlanFoasRenderer },className: 'all parentTable '}, // 1
        {title: 'Plan ID', data: 'fprId'}, // 2
        {title: 'Plan Name', data: 'planName'}, // 3
        {title: 'Requesting PD & DOC', data: 'requestorPdFullName', render: ( data, type, row, meta ) => {
            const label = (data && data.length > 0) ? data + ((row.requestingCayDoc && row.requestingCayDoc.length > 0) ? (' (' + row.requestingCayDoc + ')') : '') : '';
            return (type === 'export' || (!data || data.length == 0)) ? label : '<a href="mailto:' + row.requestorEmailAddress + '?subject=' + row.planName + ' - ' + row.requestorPdFullName + '">' + label + '</a>';
          }}, // 4
        {title: 'Requesting DOC Approver', data: 'requestingDocApprvlFullName', render: ( data, type, row, meta ) => { //TODO
            return (!data || data == null) ? '' : (type === 'export') ? data : '<a href="mailto:' + row.requestingDocApprvlEmail + '?subject=' + row.planName + ' - ' + row.requestingDocApprvlFullName + '">' + data + '</a>';
          }}, // 5
        {title: 'Final LOA', data: 'loaName'}, // 6
        {title: 'Funding Approvals', data: 'fundsCertificationCode'}, // 7
        {title: 'Program Recomm. Direct Costs', data: 'directRecommendedAmt', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : this.currencyTransformer.transform(data);
          }}, // 8
        {title: 'Program Recomm. Total Costs', data: 'totalRecommendedAmt', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : this.currencyTransformer.transform(data);
          }}, // 9
        {title: 'Status', data: 'currentStatusDescrip'}, // 10
        {title: 'Last Action Date', data: 'planStatusDate'}, // 11
        {
          title: 'Action', data: null, defaultContent: 'Select'
          ,ngTemplateRef: { ref: this.searchFundingPlanActionRenderer}, className: 'all', orderable: false
        }, // 12
        {data: null, defaultContent: ''}

      ],
      order: [[11, 'desc']],
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
      buttons: {
        buttons: [
          {
            extend: 'excelHtml5',
            className: 'btn-excel',
            titleAttr: 'Export Results in Current Page',
            text: 'Export Current Page',
            filename: 'fs-funding-requests-search-result',
            title: null,
            header: true,
            exportOptions: {
              columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
              orthogonal: 'export',
              customizeData: (d) => {
                this.logger.debug('customizeData:', d);
                d.header[0] = 'FOA';
                // Replace header "FOA information" with multiple columns
                d.header.splice(1, 0, 'FOA Title', 'NCAB Date(s)', 'Issue Type');
                for (let i = 0, size = d.body.length; i < size; i++) {
                  let foas = d.body[i][0];
                  if (foas.length > 0) {
                    let foa = foas[0];
                    d.body[i].splice(0, 1, foa.rfaPaNumber, foa.title, convertNcabs(foa.councilMeetingDateList), foa.issueType);
                    // insert additional rows if needed
                    if (foas.length > 1) {
                      for (let r = 1; r < foas.length; r++) {
                        const row = [d.body[i].length];
                        foa = foas[r];
                        row[0] = foa.rfaPaNumber;
                        row[1] = foa.title;
                        row[2] = foa.councilMeetingDateList.replace(/,/g, ', ');
                        row[3] = foa.issueType;
                        d.body.splice(i + 1, 0, row);
                        i++;
                        size++;
                      }
                    }
                  }
                  else {
                    d.body[i].splice(1, 0, '', '', '');
                  }
                }
              }
            }
          }
        ]
      },
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

    this.dtGrantOptions = {
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
        this.throttle.invoke(this, dataTablesParameters, callback, this.ajaxCallFundingGrants);
      },
      columns: [
        {title: 'Grant Number', data: 'fullGrantNum', ngTemplateRef: { ref: this.fullGrantNumberRenderer}, className: 'all'}, // 0
        {title: 'PI', data: 'piFullName', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : '<a href="mailto:' + row.piEmail + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }, className: 'all'}, // 1
        {title: 'Project Title', data: 'projectTitle'}, // 2
        {title: 'I2 Status', data: 'applStatusGroupDescrip'}, // 3
        {title: 'FOA', data: 'rfaPaNumber', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : '<a href="' + row.nihGuideAddr + '" target="_blank">' + data + '</a>';
          }, className: 'all'}, // 4
        {title: 'FY', data: 'fy'}, // 5
        {title: 'NCAB', data: 'councilMeetingDate', render: ( data, type, row, meta ) => {
          if (!data || data.substr(4, 2) === '00') {
            return '';
          }
          return data.substr(4,2) + '/' + data.substr(0,4)
        }}, // 6
        {title: 'PD', data: 'pdFullName', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : '<a href="mailto:' + row.pdEmailAddress + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }}, // 7
        {title: 'CA', data: 'cayCode', ngTemplateRef: { ref: this.cancerActivityRenderer}, className: 'all'}, // 8
        {title: 'Pctl', data: 'irgPercentileNum'}, // 9
        {title: 'PriScr', data: 'priorityScoreNum'}, // 10
        {title: 'Exists in Request', data: 'frqIdList', ngTemplateRef: { ref: this.existInRequestRenderer}, className: 'all'}, // 11
        {title: 'Exists in Plan', data: 'fprIdList', ngTemplateRef: { ref: this.existInPlanRenderer}, className: 'all'}, // 12
        {title: 'Exists in Paylist', data: 'paylistIdList', ngTemplateRef: { ref: this.existInPaylistRenderer}, className: 'all'}, // 13
        {data: null, defaultContent: ''}

      ],
      order: [[0, 'asc']],
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
        {responsivePriority: 1, targets: 0 }, // grant_num
        {responsivePriority: 2, targets: 1 }, // pi
        {responsivePriority: 3, targets: 5 }, // fy
        {responsivePriority: 5, targets: 6 }, // ncab
        {responsivePriority: 6, targets: 7 }, // pd
        {responsivePriority: 7, targets: 8 }, // ca
        {responsivePriority: 8, targets: 9 }, // pctl
        {responsivePriority: 9, targets: 10 }, // priscr
        {responsivePriority: 10, targets: 3 }, // i2 status
        {responsivePriority: 11, targets: 2 } // project title
      ],
      dom: '<"dt-controls dt-top"l<"ml-4"i><"ml-auto"fB<"d-inline-block"p>>>rt<"dt-controls"<"mr-auto"i>p>',
      buttons: [
        {
          extend: 'excel',
          className: 'btn-excel',
          titleAttr: 'Export Results in Current Page',
          text: 'Export Current Page',
          filename: 'fs-funding-requests-search-result',
          title: null,
          header: true,
          exportOptions: { columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
        }
      ],
      rowCallback: (row: Node, data: any[] | object, index: number) => {
        // Fix for Excel output - I removed empty renderers in column definitions
        // But now, I have to remove the first "text" child node to prevent it
        // from rendering (angular datatables bug)
        this.dtGrantOptions.columns.forEach((column, ind) => {
          if (column.ngTemplateRef) {
            const cell = row.childNodes.item(ind);
            if (cell?.childNodes?.length > 1) { // you have to leave at least one child node
              $(cell.childNodes.item(0)).remove();
            }
          }
        });
      }
    };

    this.selectedRows.clear();
  }

  // Since this is a callback, it cannot use this object anymore
  // Use $this instead
  ajaxCallFundingRequests($this: SearchResultComponent, dataTablesParameters: any, callback): void  {
    if (!$this.searchCriteria) {
      $this.showFundingRequestResult = false;
      callback({
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
      });
      return;
    }

    $this.loaderService.show();
    $this.searchCriteria.params = dataTablesParameters;
    $this.logger.debug('Search for Funding Requests parameters:', $this.searchCriteria);
    $this.fsSearchControllerService.searchFundingRequestsUsingPOST(
      $this.searchCriteria).subscribe(
      result => {
        $this.showFundingRequestResult = true;
        $this._populateSelectedIntoResults('frqId', result.data);
        // $this.logger.debug('Search Funding Requests result: ', result);
        $this.fundingRequests = result.data;
        callback({
          recordsTotal: result.recordsTotal,
          recordsFiltered: result.recordsFiltered,
          data: result.data
        });
        $this.loaderService.hide();
        $this.autoResizeTables($this);
      }, error => {
        $this.logger.error('HttpClient get request error for----- ' + error.message);
        alert('HttpClient get request error for----- ' + error.message);
        callback({
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        });
        alert(error.message);
      });
  }

  // Since this is a callback, it cannot use this object anymore
  // Use $this instead
  ajaxCallFundingPlans($this: SearchResultComponent, dataTablesParameters: any, callback): void  {
    if (!$this.searchCriteria) {
      $this.showFundingPlanResult = false;
      callback({
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
      });
      return;
    }

    $this.loaderService.show();
    $this.searchCriteria.params = dataTablesParameters;
    $this.logger.debug('Search Funding Plans parameters:', $this.searchCriteria);
    $this.fsSearchControllerService.searchFundingPlansUsingPOST(
      $this.searchCriteria).subscribe(
      result => {
        $this.showFundingPlanResult = true;
        $this._populateSelectedIntoResults('fprId', result.data);
        // $this.logger.debug('Search Funding Requests result: ', result);
        $this.fundingPlans = result.data;
        callback({
          recordsTotal: result.recordsTotal,
          recordsFiltered: result.recordsFiltered,
          data: result.data
        });
        $this.loaderService.hide();
        $this.autoResizeTables($this);
      }, error => {
        $this.logger.error('HttpClient get request error for----- ', error);
        alert('HttpClient get request error for----- ' + error.message);
      });

  }

  ajaxCallFundingGrants($this: SearchResultComponent, dataTablesParameters: any, callback): void {
    if (!$this.searchCriteria) {
      $this.showGrantResult = false;
      callback({
        recordsTotal: 0,
        recordsFiltered: 0,
        data: []
      });
      return;
    }

    $this.loaderService.show();
    $this.searchCriteria.params = dataTablesParameters;
    $this.logger.debug('Search for Grants parameters:', $this.searchCriteria);
    $this.fsSearchControllerService.searchFsGrantsUsingPOST(
      $this.searchCriteria).subscribe(
      result => {
        $this.showGrantResult = true;
        $this.fundingGrants = result.data;
        callback({
          recordsTotal: result.recordsTotal,
          recordsFiltered: result.recordsFiltered,
          data: result.data
        });
        $this.loaderService.hide();
        $this.autoResizeTables($this);
      }, error => {
        $this.logger.error('HttpClient get request error for----- ' + error.message);
        alert('HttpClient get request error for----- ' + error.message);
        callback({
          recordsTotal: 0,
          recordsFiltered: 0,
          data: []
        });
        alert(error.message);
      });
  }

  autoResizeTables($this: SearchResultComponent): void {
    setTimeout(() => {  // FIXED ISSUE WITH TABLE RESIZING
      $this.dtElements.forEach((dtEl: DataTableDirective) => {
        if (dtEl.dtInstance) {
          dtEl.dtInstance.then((dtInstance: DataTables.Api) => {
            dtInstance.columns.adjust();
          });
        }
      });
    }, 0);
  }

  ngOnDestroy(): void {
    this.dtFundingRequestTrigger.unsubscribe();
    this.dtFundingPlanTrigger.unsubscribe();
    this.dtGrantTrigger.unsubscribe();
    this.throttle.reset();
  }

  clear(): void {
    this.filterTypeLabel = '';
    this.showFundingRequestResult = false;
    this.showFundingPlanResult = false;
    this.showGrantResult = false;
    this.throttle.reset();
  }

  doFundingRequestSearch(criteria: FundSelectSearchCriteria, filterTypeLabel: string): void {
    this.throttle.reset();
    this.searchCriteria = criteria;
    this.filterTypeLabel = filterTypeLabel;
    this.selectedRows.clear();
//    this.batchApproveVisible = this.batchApproveService.canBatchApproveRequest();
    this.batchApproveEnabled = false;
    this.runReportEnabled = false;
    this.logger.debug('Request batch approval check ', this.batchApproveService, this.batchApproveVisible);
    this._triggerDtInstance(this.dtFundingRequestTrigger);
  }

  doFundingPlanSearch(criteria: FundSelectSearchCriteria, filterTypeLabel: string): void {
    this.throttle.reset();
    this.searchCriteria = criteria;
    this.filterTypeLabel = filterTypeLabel;
    this.selectedRows.clear();
//    this.batchApproveVisible = this.batchApproveService.canBatchApprovePlan();
    this.batchApproveEnabled = false;
    this.runReportEnabled = false;
    this.logger.debug('Plan batch approval check ', this.batchApproveService, this.batchApproveVisible);
    this._triggerDtInstance(this.dtFundingPlanTrigger);
  }

  doGrantSearch(criteria: FundSelectSearchCriteria, filterTypeLabel: string): void {
    this.throttle.reset();
    this.searchCriteria = criteria;
    this.filterTypeLabel = filterTypeLabel;
    this.selectedRows.clear();
//    this.batchApproveVisible = this.batchApproveService.canBatchApprovePlan();
    this.batchApproveEnabled = false;
    this.logger.debug('Plan batch approval check ', this.batchApproveService, this.batchApproveVisible);
    this._triggerDtInstance(this.dtGrantTrigger);
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

  onCaptureFRSelectedEvent($event: any): void {
    if ($event.frqId) {
      if ($event.selected) {
        this.selectedRows.set($event.frqId, $event);
      }
      else {
        this.selectedRows.delete($event.frqId);
      }
    }
    this.batchApproveEnabled = this.enableBatchApprove('REQUEST');
    this.runReportEnabled = this.selectedRows.size > 0;

  }

  onCaptureFPSelectedEvent($event: any): void {
    if ($event.fprId) {
      if ($event.selected) {
        this.selectedRows.set($event.fprId, $event);
      }
      else {
        this.selectedRows.delete($event.fprId);
      }
    }
    this.batchApproveEnabled = this.enableBatchApprove('PLAN');
    this.runReportEnabled = this.selectedRows.size > 0;

  }

  enableBatchApprove(requestOrPlan: 'REQUEST'|'PLAN'): boolean {
    for (const id of this.selectedRows.keys()){
      if ((requestOrPlan === 'REQUEST' && this.batchApproveService.canApproveRequest(id))
      || (requestOrPlan === 'PLAN' && this.batchApproveService.canApprovePlan(id)) ) {
        return true;
      }
    }
    return false;
  }

  private _populateSelectedIntoResults(id: string, data: Array<any>): void {
    if (data) {
      for (const entry of data) {
        entry.selected = this.selectedRows.has(entry[id]);
      }
    }
  }

  onOpenFundingRequest($event: any): void {
    this.logger.debug('onOpenFundingRequest() - request/retrieve', $event.frqId);
    this.router.navigate(['request/retrieve', $event.frqId]);
  }

  onOpenFundingPlan($event: any): void {
    this.router.navigate(['plan/retrieve', $event.fprId]);

  }

  onRequestSelect($event: number) {
    this.logger.debug('onRequestSelect() - request/retrieve', $event);
    this.router.navigate(['request/retrieve', $event]);
  }

  onPlanSelect($event: number) {
    this.logger.debug('onRequestSelect() - plan/retrieve', $event);
    this.router.navigate(['plan/retrieve', $event]);
  }

  onPaylistSelect($event: any) {
    if ($event.fy < 2020) {
      // NOTE - jasperReportController DOES NOT work
      window.open('/i2ecws/api/v1/generate-paylist-report/' + $event.id + '/JR_HISTORICALPAYLIST_REPORT/PDF', '_blank');
    }
    else if (this.canOpenPaylist) {
      window.open('/paylist/view-paylist?' + $event.id, '_self');
    }
    else {
      window.open('/i2ecws/api/v1/generate-paylist-report/' + $event.id + '/JR_NONHISTORICALPAYLIST_REPORT/PDF', '_blank');
    }

  }

  get batchApproveVisible(): boolean {
    return ( this.showFundingPlanResult
             && this.batchApproveService.canBatchApprovePlan() )
  //           && this.searchCriteria?.searchWithIn === FilterTypeLabels.FILTER_FUNDING_PLAN_AWAITING_RESPONSE )
        || ( this.showFundingRequestResult
             && this.batchApproveService.canBatchApproveRequest() );
  //           && this.searchCriteria.searchWithIn === FilterTypeLabels.FILTER_REQUEST_AWAITING_RESPONSE );
  }

  showBatchApproveModal(): void {
    if (this.fundingRequests && this.fundingRequests.length > 0) {
      this.batchApproveModal.openModalForRequests([...this.selectedRows.values()])
      .finally( () => {
        if (this.batchApproveModal.batchApproveSuccess) {
          this.doFundingRequestSearch(this.searchCriteria, this.filterTypeLabel);
        }
      });
    }
    else if (this.fundingPlans && this.fundingPlans.length > 0) {
      this.batchApproveModal.openModalForPlans([...this.selectedRows.values()])
      .finally( () => {
        if (this.batchApproveModal.batchApproveSuccess) {
          this.doFundingPlanSearch(this.searchCriteria, this.filterTypeLabel);
        }
      });
     }
  }

  runDetailedReport(): void {
    if (this.fundingRequests && this.fundingRequests.length > 0) {
        this.downloadDetailReport([...this.selectedRows.keys()], true);
    }
    else if (this.fundingPlans && this.fundingPlans.length > 0) {
      this.downloadDetailReport([...this.selectedRows.keys()], false);
    }
  }

  downloadDetailReport(ids: number[], isRequest: boolean): void {
    this.documentService.downloadDetailReport(ids, isRequest)
          .subscribe(
            (response: HttpResponse<Blob>) => {
              const blob = new Blob([response.body], { type: response.headers.get('content-type') });
              saveAs(blob, 'Detail Report.pdf');
            }
          );
  }

}
