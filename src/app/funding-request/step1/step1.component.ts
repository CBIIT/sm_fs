import {
  AfterContentInit,
  AfterViewInit,
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  TemplateRef
} from '@angular/core';
import {FsRequestControllerService, GrantsSearchCriteriaDto, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {Subject} from 'rxjs';
import {AppPropertiesService} from 'src/app/service/app-properties.service';
import {GrantsSearchFilterService} from '../grants-search/grants-search-filter.service';
import {AppUserSessionService} from 'src/app/service/app-user-session.service';
import { GrantnumberSearchCriteriaComponent } from '@nci-cbiit/i2ecui-lib';
import { LoaderService } from 'src/app/service/loader-spinner.service';
import { NGXLogger } from 'ngx-logger';
import {FullGrantNumberCellRendererComponent} from '../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import {DataTableDirective} from 'angular-datatables';
import {ExistingRequestsCellRendererComponent} from '../../table-cell-renderers/existing-requests-cell-renderer/existing-requests-cell-renderer.component';
import {FundingRequestActionCellRendererComponent} from './funding-request-action-cell-renderer/funding-request-action-cell-renderer.component';
import {CancerActivityCellRendererComponent} from '../../table-cell-renderers/cancer-activity-cell-renderer/cancer-activity-cell-renderer.component';
import { NavigationStepModel } from '../step-indicator/navigation-step.model';
import { ActivatedRoute } from '@angular/router';
import { RequestModel } from 'src/app/model/request/request-model';

@Component({
  selector: 'app-step1',
  templateUrl: './step1.component.html',
  styleUrls: ['./step1.component.css']
})
export class Step1Component implements OnInit, AfterViewInit, AfterContentInit, OnDestroy {

  constructor(private gsfs: GrantsSearchFilterService,
              private fsRequestControllerService: FsRequestControllerService,
              private propertiesService: AppPropertiesService,
              private userSessionService: AppUserSessionService,
              private loaderService: LoaderService,
              private logger: NGXLogger,
              private route: ActivatedRoute,
              private requestModel: RequestModel,
              private navigationModel: NavigationStepModel) {
  }

  @ViewChild(GrantnumberSearchCriteriaComponent) grantNumberComponent: GrantnumberSearchCriteriaComponent;

  @ViewChild(DataTableDirective, {static: false}) dtElement: DataTableDirective;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;
  @ViewChild('cancerActivityRenderer') cancerActivityRenderer: TemplateRef<CancerActivityCellRendererComponent>;
  @ViewChild('existingRequestsRenderer') existingRequestsRenderer: TemplateRef<ExistingRequestsCellRendererComponent>;
  @ViewChild('fundingRequestActionRenderer') fundingRequestActionRenderer: TemplateRef<FundingRequestActionCellRendererComponent>;

  dataTable: any;

  grantList: NciPfrGrantQueryDto[] = [];

//  dtOptions:  DataTables.Settings;
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject();
  showAdvancedFilters = false;
  // search criteria
  piName: string;
  searchWithin: string;
  fyRange: any = {};
  ncabRange: any = {};
  selectedPd: number;
  selectedRfaPa: string;
  selectedCas: string[] | string = [];
  i2Status: string;

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  eGrantsUrl: string = this.propertiesService.getProperty('EGRANTS_URL');
  searchCriteria: GrantsSearchCriteriaDto = this.gsfs.getGrantsSearchCriteria();

  tooltipGrant: any;

  get noResult(): boolean {
    return !this.grantList || this.grantList.length === 0;
  }

  ngAfterViewInit(): void {
    // this.initDatatable();
    this.grantNumberComponent.grantNumberType = this.searchCriteria.grantType;
    this.grantNumberComponent.grantNumberMech = this.searchCriteria.grantMech;
    this.grantNumberComponent.grantNumberIC = this.searchCriteria.grantIc;
    this.grantNumberComponent.grantNumberSerial = this.searchCriteria.grantSerial;
    this.grantNumberComponent.grantNumberYear = this.searchCriteria.grantYear;
    this.grantNumberComponent.grantNumberSuffix = this.searchCriteria.grantSuffix;

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
        this.loaderService.show();
        // this.logger.debug('Funding Request search for: ', this.searchCriteria);
        this.fsRequestControllerService.searchDtGrantsUsingPOST(
          Object.assign(dataTablesParameters, this.searchCriteria)).subscribe(
          result => {
            // this.logger.debug('Funding Request search result: ', result);
            this.grantList = result.data;
            this.gsfs.searched = true;
            callback({
              recordsTotal: result.recordsTotal,
              recordsFiltered: result.recordsFiltered,
              data: result.data
            });
            this.loaderService.hide();
          }, error => {
            this.loaderService.hide();
            this.logger.error('HttpClient get request error for----- ' + error.message);
          });
      },

      columns: [
        {title: 'Grant Number', data: 'fullGrantNum', ngTemplateRef: { ref: this.fullGrantNumberRenderer}, className: 'all'},
        {title: 'PI', data: 'piFullName', render: ( data, type, row, meta ) => {
            return (!data || data == null) ? '' : '<a href="mailto:' + row.piEmail + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }, className: 'all'},
        {title: 'Project Title', data: 'projectTitle'},
        {title: 'FOA', data: 'rfaPaNumber', render: ( data, type, row, meta ) => {
          return (!data || data == null) ? '' : '<a href="' + row.nihGuideAddr + '" target="_blank" >' + data + '</a>';
        }},
        {title: 'I2 Status', data: 'applStatusGroupDescrip'},
        {title: 'PD', data: 'pdFullName', render: ( data, type, row, meta ) => {
          return (!data || data == null) ? '' : '<a href="mailto:' + row.pdEmailAddress + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
          }},
        {title: 'CA', data: 'cayCode', ngTemplateRef: { ref: this.cancerActivityRenderer}, className: 'all'},
        {title: 'FY', data: 'fy'},
        {title: 'NCAB', data: 'councilMeetingDate', defaultContent: '', render: ( data, type, row, meta) => {
            return (data) ? data.substr(4, 2) + '/' + data.substr(0, 4) : '';
          }},
        {title: 'Pctl', data: 'irgPercentileNum'},
        {title: 'PriScr', data: 'priorityScoreNum'},
        {title: 'Budget Start Date', data: 'budgetStartDate'},
        {title: 'Existing Requests', data: 'requestCount',
         ngTemplateRef: { ref: this.existingRequestsRenderer}, className: 'all'},
        {title: 'Action', data: null,  defaultContent: 'Select',
         ngTemplateRef: { ref: this.fundingRequestActionRenderer}, className: 'all'},
        {data: null, defaultContent: ''}
      ],
      // columnDefs: [ { orderable: false, targets: -1 }],.
      // responsive: true,

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
        {responsivePriority: 2, targets: 13 }, // action
        {responsivePriority: 3, targets: 1 }, // pi
        {responsivePriority: 4, targets: 8 }, // ncab
        {responsivePriority: 5, targets: 7 }, // fy
        {responsivePriority: 6, targets: 5 }, // pd
        {responsivePriority: 7, targets: 6 }, // ca
        {responsivePriority: 8, targets: 9 }, // pctl
        {responsivePriority: 9, targets: 10 }, // priscr
        {responsivePriority: 10, targets: 3 }, // FOA
        {responsivePriority: 11, targets: 12 }, // existing requests
        {responsivePriority: 12, targets: 2 }, // project title
        {responsivePriority: 13, targets: 4 }, // i2 status
        {responsivePriority: 14, targets: 11 } // budget start date
      ],
      // dom:  '<"table-controls"<""l><"ml-auto mr-2"B><""p>>' +
      //       '<"row"<"col-12"tr>>' +
      //       '<"table-controls"<""i><"ml-auto mr-2"B><""p>>',
      // buttons: {
      //     dom: {
      //       button: {
      //         tag: 'button',
      //         className: 'btn btn-sm btn-outline-secondary'
      //       }
      //     },
      dom: '<"dt-controls"l<"ml-auto"fB<"d-inline-block"p>>>rt<"dt-controls"<"mr-auto"i>p>',
      buttons: [
        {
          extend: 'excel',
          className: 'btn-excel',
          titleAttr: 'Excel export',
          text: 'Export',
          filename: 'fs-grants-search-result',
          title: null,
          header: true,
          exportOptions: { columns: [ 0, 1, 2, 3, 4 , 5 , 6, 7, 8, 9, 10, 11, 12 ] }
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
      }      // },
    };

    this.search();
    setTimeout(() => this.dtTrigger.next(), 0);

  }

  ngAfterContentInit(): void {
    this.restoreSearchFilter();
  }

  ngOnInit(): void {
    const isNewRequest = this.route.snapshot.params.new;
    if (isNewRequest) {
      this.requestModel.reset();
    }
    this.navigationModel.showSteps = true;
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }

  toString(aString): string{
    if (!aString) {
      return '';
    }
    else {
      return aString.toString();
    }
  }

  validFilter(): boolean {
    if (this.fyRange.fromFy && this.fyRange.toFy ) {
      return true;
    }
    if (this.searchWithin) {
      return true;
    }
    if (this.grantNumberComponent && this.grantNumberComponent.grantNumberIC && this.grantNumberComponent.grantNumberSerial) {
      return true;
    }
    return false;
  }

  showNoResult(): boolean {
    this.logger.debug('showNoResult grant list:', this.grantList);
    if (!this.grantList) {
      return true;
    }
    else if ( this.grantList.length === 0) {
      return true;
    }

    return false;
  }

  search(): void {

    if (this.searchWithin === 'mypf') {
      this.searchCriteria.pdNpnId =  this.userSessionService.getLoggedOnUser().npnId + '';
    }
    else {
      this.searchCriteria.pdNpnId = (this.selectedPd as any as string);
    }

    if (this.searchWithin === 'myca') {
      this.searchCriteria.cayCodes = this.userSessionService.getUserCaCodes();
    }
    else {
      this.searchCriteria.cayCodes = typeof this.selectedCas === 'string' ? [this.selectedCas] : this.selectedCas ;
    }
    this.gsfs.selectedPd = this.selectedPd;
    this.gsfs.searchWithin = this.searchWithin;
    this.searchCriteria.fromFy = this.fyRange.fromFy;
    this.searchCriteria.toFy = this.fyRange.toFy;
    if (this.searchCriteria.toFy && this.searchCriteria.fromFy
      && this.searchCriteria.toFy < this.searchCriteria.fromFy) {
        alert('Invalid FY date range provided.');
        return;
    }
    this.searchCriteria.fromCouncilMeetingDate = this.ncabRange.fromNcab;
    this.searchCriteria.toCouncileMeetingDate = this.ncabRange.toNcab;
    if (this.searchCriteria.fromCouncilMeetingDate && this.searchCriteria.toCouncileMeetingDate
      && this.searchCriteria.toCouncileMeetingDate < this.searchCriteria.fromCouncilMeetingDate) {
        alert('Invalid NCAB date range provided.');
        return;
    }

    this.searchCriteria.applStatusGroupCode = this.i2Status;
    this.searchCriteria.piName = this.piName;

    this.searchCriteria.rfaPa = this.selectedRfaPa;
    this.searchCriteria.grantType = this.toString(this.grantNumberComponent.grantNumberType);
    this.searchCriteria.grantMech = this.toString(this.grantNumberComponent.grantNumberMech);
    this.searchCriteria.grantIc = this.toString(this.grantNumberComponent.grantNumberIC);
    this.searchCriteria.grantSerial = this.toString(this.grantNumberComponent.grantNumberSerial);
    this.searchCriteria.grantYear = this.toString(this.grantNumberComponent.grantNumberYear);
    this.searchCriteria.grantSuffix = this.toString(this.grantNumberComponent.grantNumberSuffix);

    if (this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.destroy();
        this.dtTrigger.next();
      });
    }
  }

  private initDatatable(): void {
    // this.dataTable = $('table#grantDt').DataTable(this.dtOptions);
  //  this.dataTable.columns.adjust().responsive.recalc();
  }

  clear(): void {
    this.searchWithin = this.gsfs.defaultSearchWithin;
    this.fyRange = {fromFy: this.gsfs.currentFy - 1, toFy: this.gsfs.currentFy};
    this.piName = '';
    this.ncabRange = {fromNcab: '', toNcab: ''};
    this.selectedPd = null;
    this.selectedRfaPa = '';
    this.selectedCas = [];
    this.i2Status = '';

    this.grantNumberComponent.grantNumberType = '';
    this.grantNumberComponent.grantNumberMech = '';
    this.grantNumberComponent.grantNumberIC = '';
    this.grantNumberComponent.grantNumberSerial = '';
    this.grantNumberComponent.grantNumberYear = '';
    this.grantNumberComponent.grantNumberSuffix = '';
  }

  // restore the search criteria when user navigates back to step1 from step2, step3 ...
  restoreSearchFilter(): void {
    // this.logger.debug('Restore search filter: ', this.gsfs, this.searchCriteria);
  //  this.searchWithin = '';
    this.piName = this.searchCriteria.piName;
    this.fyRange = {fromFy: this.searchCriteria.fromFy, toFy: this.searchCriteria.toFy};
    this.ncabRange = {fromNcab: this.searchCriteria.fromCouncilMeetingDate, toNcab: this.searchCriteria.toCouncileMeetingDate};
    this.selectedPd = this.gsfs.selectedPd;
    this.searchWithin = this.gsfs.searchWithin;
    this.selectedRfaPa = this.searchCriteria.rfaPa;
    this.selectedCas = this.searchCriteria.cayCodes;
    this.i2Status = this.searchCriteria.applStatusGroupCode;

  }

  showHideAdvanced(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  setGrant(grant): void {
    this.tooltipGrant = grant;
  }

  isDate(value): boolean {
    return value instanceof Date && !isNaN(value.valueOf());
  }

  toDate(value): Date {
    return new Date(value.replace(/-/g, '/'));
  }

}


