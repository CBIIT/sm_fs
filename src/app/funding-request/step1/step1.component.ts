import {AfterContentInit, AfterViewInit, Component, Inject, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {FsRequestControllerService, GrantsSearchCriteriaDto, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {Subject} from 'rxjs';
import {AppPropertiesService} from 'src/app/service/app-properties.service';
import {GrantsSearchFilterService} from '../grants-search/grants-search-filter.service';
import {RequestModel} from '../../model/request-model';
import {AppUserSessionService} from 'src/app/service/app-user-session.service';
import { GrantnumberSearchCriteriaComponent } from '@nci-cbiit/i2ecui-lib';
import {getCurrentFiscalYear} from 'src/app/utils/utils';
import { LoaderService } from 'src/app/service/loader-spinner.service';
import { NGXLogger } from "ngx-logger";

@Component({
  selector: 'app-step1',
  templateUrl: './step1.component.html',
  styleUrls: ['./step1.component.css']
})
export class Step1Component implements OnInit, AfterViewInit, AfterContentInit {

  constructor(private router: Router,
              private gsfs: GrantsSearchFilterService,
              private fsRequestControllerService: FsRequestControllerService,
              private propertiesService: AppPropertiesService,
              private userSessionService: AppUserSessionService,
              private requestModel: RequestModel,
              private loaderService: LoaderService,
              private logger: NGXLogger) {
  }

  @ViewChild('grantDt') myTable;
 // @ViewChild(DataTableDirective, {static: false}) myTable: DataTableDirective;
  @ViewChild(GrantnumberSearchCriteriaComponent) grantNumberComponent: GrantnumberSearchCriteriaComponent;

  dataTable: any;

  grantList: NciPfrGrantQueryDto[] = [];

//  dtOptions:  DataTables.Settings;
  dtOptions: any;
  dtTrigger: Subject<any> = new Subject();
  showAdvancedFilters = false;
  // search criteria
  piName: string;
  searchWithin: string;
  fyRange: any = {};
  ncabRange: any = {};
  selectedPd: number;
  selectedRfaPa: string;
  selectedCas: string[] = [];
  i2Status: string;

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');
  eGrantsUrl: string = this.propertiesService.getProperty('EGRANTS_URL');
  searchCriteria: GrantsSearchCriteriaDto = this.gsfs.getGrantsSearchCriteria();

  tooltipGrant: any;

  get noResult(): boolean {
    return !this.grantList || this.grantList.length === 0;
  }

  ngAfterViewInit(): void {
    this.logger.debug("step1 afterViewInit() is called");
    // this.initDatatable();
    this.grantNumberComponent.grantNumberType = this.searchCriteria.grantType;
    this.grantNumberComponent.grantNumberMech = this.searchCriteria.grantMech;
    this.grantNumberComponent.grantNumberIC = this.searchCriteria.grantIc;
    this.grantNumberComponent.grantNumberSerial = this.searchCriteria.grantSerial;
    this.grantNumberComponent.grantNumberYear = this.searchCriteria.grantYear;
    this.grantNumberComponent.grantNumberSuffix = this.searchCriteria.grantSuffix;

    if (this.gsfs.searched) {
      this.initDatatable();
    }

  }

  ngAfterContentInit(): void {
    this.restoreSearchFilter();
  }

  ngOnInit(): void {

 //   this.restoreSearchFilter();

    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 100,
      serverSide: true,
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
        console.log('calling search backend');
        this.fsRequestControllerService.searchDtGrantsUsingPOST(
          Object.assign(dataTablesParameters, this.searchCriteria)).subscribe(
          result => {
            console.log('searchDtGrantsUsingPost returned ', result);
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
            console.log('HttpClient get request error for----- ' + error.message);
          });
      },

      columns: [ {data: 'fullGrantNum'},
                {data: 'piFullName'},
                {data: 'applStatusGroupDescrip'},
                {data: 'projectTitle'},
                {data: 'orgName'},
                {data: 'fy'},
                {data: 'councilMeetingDate'},
                {data: 'irgPercentileNum'},
                {data: 'priorityScoreNum'},
                {data: 'cayCode'},
                {data: 'pdFullName'},
                {data: 'budgetStartDate'},
                {data: 'requestCount'},
                {data: null, defaultContent: 'Select', }
 //               {data: null, defaultContent: ''}
              ],
      columnDefs: [ { orderable: false, targets: -1 }],

      // responsive: {
      //   details: {
      //     type: 'column',
      //     target: -1
      //   }
      // },
      // columnDefs: [
      //   {
      //   className: 'control',
      //   orderable: false,
      //   targets: -1
      //   },
      //   {responsivePriority: 1, targets: 0 }, // grant_num
      //   {responsivePriority: 2, targets: 13 }, // action
      //   {responsivePriority: 3, targets: 3 }, // pi
      //   {responsivePriority: 4, targets: 6 }, // ncab
      //   {responsivePriority: 5, targets: 5 }, // fy
      //   {responsivePriority: 6, targets: 10 }, // pd
      //   {responsivePriority: 7, targets: 9 }, // ca
      //   {responsivePriority: 8, targets: 7 }, // pctl
      //   {responsivePriority: 9, targets: 8 }, // priscr
      //   {responsivePriority: 10, targets: 12 }, // existing requests
      //   {responsivePriority: 11, targets: 2 }, // i2 status
      //   {responsivePriority: 12, targets: 1 }, // project title
      //   {responsivePriority: 13, targets: 11 }, // budget start date
      //   {responsivePriority: 14, targets: 4 }  // institute
      // ],
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
        ]
      // },
    };
  }

  nextStep(event, grant): void {
    this.requestModel.reset();
    this.requestModel.requestDto.userLdapId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    this.requestModel.grant = grant;
    this.router.navigate(['/request/step2']);
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
    console.log('showNoResult called', this.grantList);
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
      this.searchCriteria.cayCodes = this.selectedCas;
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

    console.log('grant search criteria', this.searchCriteria);

    if (this.dataTable) {
          console.log('destroy datatable');
          this.dataTable.destroy();
          this.dataTable = null;
    }
    setTimeout(() => this.initDatatable(), 0);
  }

  private initDatatable(): void {
    this.dataTable = $('table#grantDt').DataTable(this.dtOptions);
  //  this.dataTable.columns.adjust().responsive.recalc();
  }

  clear(): void {
    this.searchWithin = '';
    this.piName = '';
    this.fyRange = {fromFy: '', toFy: ''};
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

  restoreSearchFilter(): void {
    console.log('inside restore search filter', this.gsfs, this.searchCriteria);
    console.log('gsfs i2status', this.searchCriteria.applStatusGroupCode);
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

  actionDisabled(grant: NciPfrGrantQueryDto): boolean {
    const disabledStatuses: string[] = ['W', 'T', 'C', 'U', 'N', 'RR'];
    if (grant.applTypeCode === '3' || disabledStatuses.indexOf(grant.applStatusGroupCode) !== -1) {
      return true;
    }
    else {
      return false;
    }
  }

  disabledTooltip(grant: NciPfrGrantQueryDto): string {
    if (grant.applTypeCode === '3') {
      return 'Select the parent grant to request supplements';
    }
    else {
      return 'Grant Application is in the ' + grant.applStatusGroupDescrip +
      ' IMPAC II status and cannot be selected for requesting funds.';
    }
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


