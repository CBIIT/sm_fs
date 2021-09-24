import {AfterViewInit, Component, OnDestroy, OnInit, TemplateRef, ViewChild} from '@angular/core';
import { FundSelectSearchCriteriaRes, FsSearchControllerService, FundingRequestQueryDatatableDto, FundingRequestQueryDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import {Subject} from "rxjs";
import {AppPropertiesService} from "../../service/app-properties.service";
import {LoaderService} from "../../service/loader-spinner.service";
import {DataTableDirective} from "angular-datatables";
import {FullGrantNumberCellRendererComponent} from "../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component";
import {CancerActivityCellRendererComponent} from "../../table-cell-renderers/cancer-activity-cell-renderer/cancer-activity-cell-renderer.component";
import {SelectFundingRequestCheckboxCellRendererComponent} from "./select-funding-request-checkbox-cell-renderer/select-funding-request-checkbox-cell-renderer.component";

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
              private logger: NGXLogger) { }

  @ViewChild(DataTableDirective, {static: false}) dtElement: DataTableDirective;
  @ViewChild('selectFundingRequestCheckboxRenderer') selectFundingRequestCheckboxRenderer: TemplateRef<SelectFundingRequestCheckboxCellRendererComponent>;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;
  @ViewChild('cancerActivityRenderer') cancerActivityRenderer: TemplateRef<CancerActivityCellRendererComponent>;

  // dtOptions: DataTables.Settings = {};
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject();
  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  eGrantsUrl: string = this.propertiesService.getProperty('EGRANTS_URL');

  fundingRequests: FundingRequestQueryDto[];
  searchCriteria: FundSelectSearchCriteriaRes;
  params: any;

  searchResult;
  noResult: boolean;


  ngAfterViewInit(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 100,
      serverSide: true,
      processing: true,
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
          this.noResult = true;
          callback({
            recordsTotal: 0,
            recordsFiltered: 0,
            data: []
          });
          return;
        }

        this.loaderService.show();
        this.searchCriteria.params = dataTablesParameters;
        this.fsSearchControllerService.searchFundingRequestsUsingPOST(
          this.searchCriteria).subscribe(
          result => {
            // this.logger.debug('Search Funding Requests result: ', result);
            this.fundingRequests = result.data;
            this.noResult = result.recordsTotal <= 0;
            callback({
              recordsTotal: result.recordsTotal,
              recordsFiltered: result.recordsFiltered,
              data: result.data
            });
            this.loaderService.hide();
          }, error => {
            this.logger.error('HttpClient get request error for----- ' + error.message);
          });
      },
      columns: [
        {title: 'Sel', data: 'selected', orderable: false, ngTemplateRef: { ref: this.selectFundingRequestCheckboxRenderer }, className: 'all' }, // 0
        {title: 'Grant Number', data: 'fullGrantNum', ngTemplateRef: { ref: this.fullGrantNumberRenderer}, className: 'all'},
        {title: 'PI', data: 'piFullName', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : '<a href="mailto:' + row.piEmail + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }, className: 'all'},
        {title: 'Project Title', data: 'projectTitle'},
        {title: 'I2 Status', data: 'applStatusGroupDescrip'},
        {title: 'PD', data: 'pdFullName', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : '<a href="mailto:' + row.pdEmailAddress + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }},
        {title: 'CA', data: 'cayCode', ngTemplateRef: { ref: this.cancerActivityRenderer}, className: 'all'},
        {title: 'FY', data: 'fy'},
        {title: 'Request ID', data: 'requestId'},
        {title: 'Request Name', data: 'requestName'},
        {title: 'Request Type', data: 'requestType'},
        {title: 'Requesting DOC Approver', data: 'approverFullName', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : '<a href="mailto:' + row.approverEmailAddress + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }},
        {title: 'Final LOA', data: 'finalLoa'},
        {title: 'Funding Approvals', data: 'fundingApprovals'},
        {title: 'Status', data: 'statusDescrip'},
        {title: 'Last Action Date', data: 'lastActionDate'},
        {
          title: 'Action', data: null, defaultContent: 'Select'
          // ,ngTemplateRef: { ref: this.fundingRequestActionRenderer}, className: 'all'},
        },
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
        }
      ],
      dom: '<"dt-controls"l<"ml-auto"fB<"d-inline-block"p>>>rt<"dt-controls"<"mr-auto"i>p>',
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

    setTimeout(() => {
      // // this.search();
      this.dtTrigger.next();
    }, 0);
  }

    ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }

  doSearch(criteria: FundSelectSearchCriteriaRes): void {
    this.searchCriteria = criteria;

    if (this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.destroy();
        this.dtTrigger.next();
      });
    }
  }

  onCaptureSelectedEvent($event: any) {

  }
}
