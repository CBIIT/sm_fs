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
import {NgForm} from "@angular/forms";

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
  @ViewChild('searchForm') searchForm: NgForm;

  dataTable: any;

  grantList: NciPfrGrantQueryDto[] = [];

//  dtOptions:  DataTables.Settings;
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject();
  showAdvancedFilters = false;
  // search criteria
  piName: string;
  searchWithin: string;
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
        this.throttle(dataTablesParameters, callback);
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

    setTimeout(() => {
      this.searchForm.form.patchValue({
        grantNumber: {
          grantNumberType: this.searchCriteria.grantType,
          grantNumberMech: this.searchCriteria.grantMech,
          grantNumberIC: this.searchCriteria.grantIc,
          grantNumberSerial: this.searchCriteria.grantSerial,
          grantNumberYear: this.searchCriteria.grantYear,
          grantNumberSuffix: this.searchCriteria.grantSuffix
        },
        fyRange: {
          fromFy: this.searchCriteria.fromFy,
          toFy: this.searchCriteria.toFy
        },
        ncabRange: {
          fromNcab: this.searchCriteria.fromCouncilMeetingDate,
          toNcab: this.searchCriteria.toCouncileMeetingDate
        }
      });
      this.search();
      this.dtTrigger.next();
    }, 0);

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


  dtPreviousSearchValue: string;
  dtLast: number;
  dtTimer: NodeJS.Timeout;
  dtFrequency: number = 800;  // ms

  throttle(dataTablesParameters: any, callback): void {
    const filterValue = dataTablesParameters.search?.value;
    if (!filterValue || filterValue === '' || this.dtPreviousSearchValue === filterValue) { // initial search, sort, pagination, etc
      // this.logger.debug('Ajax call - immediate search: ',filterValue, this.dtPreviousSearchValue);
      this.dtPreviousSearchValue = filterValue;
      this.ajaxCall(dataTablesParameters, callback);
      return;
    }

    const now  = +new Date();
    if (!this.dtLast || now < this.dtLast + this.dtFrequency) {
      clearTimeout(this.dtTimer);
      this.dtLast = now;
      // this.logger.debug('Ajax call - create new timer: ',filterValue, this.dtPreviousSearchValue);
      this.dtPreviousSearchValue = filterValue;
      this.dtTimer = setTimeout(() => {
        this.dtTimer = undefined;
        this.dtLast = undefined;
        // this.logger.debug('Ajax call - delayed search: ',dataTablesParameters.search?.value, this.dtPreviousSearchValue);
        this.ajaxCall(dataTablesParameters, callback);
      }, this.dtFrequency);
    }
    else {

    }
  }

  ajaxCall(dataTablesParameters: any, callback): void {
    this.loaderService.show();
    // this.logger.debug('Funding Request search for: ', this.searchCriteria);
    this.fsRequestControllerService.searchDtGrantsUsingPOST(
      Object.assign(dataTablesParameters, this.searchCriteria)).subscribe(
      result => {
        this.grantList = result.data;
        this.gsfs.searched = true;
        callback({
                   recordsTotal: result.recordsTotal,
                   recordsFiltered: result.recordsFiltered,
                   data: result.data
                 });
        this.loaderService.hide();
      },
      error => {
        this.loaderService.hide();
        this.logger.error('HttpClient get request error for----- ' + error.message);
      }
    );
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
    if (this.searchWithin) {
      return true;
    }

    if (this.searchForm.form.value.fyRange.fromFy && this.searchForm.form.value.fyRange.toFy ) {
      return true;
    }

    if (this.searchForm.form.value.grantNumber && this.searchForm.form.value.grantNumber.grantNumberIC && this.searchForm.form.value.grantNumber.grantNumberSerial) {
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

    if (!this.searchForm.valid) {
      return;
    }

    this.dtPreviousSearchValue = undefined; // reset the filter

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
    this.searchCriteria.fromFy = this.searchForm.form.value.fyRange.fromFy;
    this.searchCriteria.toFy = this.searchForm.form.value.fyRange.toFy;
    this.searchCriteria.fromCouncilMeetingDate = this.searchForm.form.value.ncabRange.fromNcab;
    this.searchCriteria.toCouncileMeetingDate = this.searchForm.form.value.ncabRange.toNcab;
    this.searchCriteria.applStatusGroupCode = this.i2Status;
    this.searchCriteria.piName = this.piName;

    this.searchCriteria.rfaPa = this.selectedRfaPa;
    this.searchCriteria.grantType = this.searchForm.value.grantNumber.grantNumberType
    this.searchCriteria.grantMech = this.searchForm.value.grantNumber.grantNumberMech;
    this.searchCriteria.grantIc = this.searchForm.value.grantNumber.grantNumberIC;
    this.searchCriteria.grantSerial = this.searchForm.value.grantNumber.grantNumberSerial;
    this.searchCriteria.grantYear = this.searchForm.value.grantNumber.grantNumberYear;
    this.searchCriteria.grantSuffix = this.searchForm.value.grantNumber.grantNumberSuffix;

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
    this.piName = '';
    this.selectedPd = null;
    this.selectedRfaPa = '';
    this.selectedCas = [];
    this.i2Status = '';

    this.searchForm.form.patchValue({
      grantNumber: {
        grantNumberType: '',
        grantNumberMech: '',
        grantNumberIC: '',
        grantNumberSerial: '',
        grantNumberYear: '',
        grantNumberSuffix: ''
      },
      fyRange: {
        fromFy: this.gsfs.currentFy - 1,
        toFy: this.gsfs.currentFy
      },
      ncabRange: {
        fromNcab: '',
        toNcab: ''
      }
    });
  }

  // restore the search criteria when user navigates back to step1 from step2, step3 ...
  restoreSearchFilter(): void {
    // this.logger.debug('Restore search filter: ', this.gsfs, this.searchCriteria);
  //  this.searchWithin = '';
    this.piName = this.searchCriteria.piName;
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


