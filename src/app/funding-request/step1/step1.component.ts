import {AfterViewInit, Component, Inject, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {FsRequestControllerService, GrantsSearchCriteriaDto, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {DataTableDirective} from 'angular-datatables';
import {Subject} from 'rxjs';
import {AppPropertiesService} from 'src/app/service/app-properties.service';
import {GrantsSearchFilterService} from '../grants-search/grants-search-filter.service';
import {RequestModel} from '../../model/request-model';
import {AppUserSessionService} from 'src/app/service/app-user-session.service';
import {GrantnumberSearchCriteriaComponent} from '@nci-cbiit/i2ecui-lib';
import {getCurrentFiscalYear} from 'src/app/utils/utils';

@Component({
  selector: 'app-step1',
  templateUrl: './step1.component.html',
  styleUrls: ['./step1.component.css']
})
export class Step1Component implements OnInit, AfterViewInit {

  constructor(private router: Router,
              private gsfs: GrantsSearchFilterService,
              private fsRequestControllerService: FsRequestControllerService,
              private propertiesService: AppPropertiesService,
              private userSessionService: AppUserSessionService,
              private requestModel: RequestModel) {
  }

  // @ViewChild('grantDt') myTable;
  @ViewChild(GrantnumberSearchCriteriaComponent) grantNumberComponent: GrantnumberSearchCriteriaComponent;

  dataTable: any;

  grantList: NciPfrGrantQueryDto[];

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

  disabledStatuses: string[] = ['W', 'T', 'C', 'U', 'N', 'RR'];

  ngAfterViewInit(): void {
    console.log('step1 afterViewInit() is called');
    this.initDatatable();
  }


  ngOnInit(): void {

    const curFy = getCurrentFiscalYear();
    this.fyRange = {fromFy: curFy - 1, toFy: curFy};

    this.searchWithin = 'mypf';

    this.dtOptions = {
      pageLength: 10,
      responsive: {
        details: {
          type: 'column',
          target: -1
        }
      },
      columnDefs: [{
        className: 'control',
        orderable: false,
        targets: -1
      },
        {responsivePriority: 1, targets: 0}, // grant_num
        {responsivePriority: 2, targets: 13}, // action
        {responsivePriority: 3, targets: 3}, // pi
        {responsivePriority: 4, targets: 6}, // ncab
        {responsivePriority: 5, targets: 5}, // fy
        {responsivePriority: 6, targets: 10}, // pd
        {responsivePriority: 7, targets: 9}, // ca
        {responsivePriority: 8, targets: 7}, // pctl
        {responsivePriority: 9, targets: 8}, // priscr
        {responsivePriority: 10, targets: 12}, // existing requests
        {responsivePriority: 11, targets: 2}, // i2 status
        {responsivePriority: 12, targets: 1}, // project title
        {responsivePriority: 13, targets: 11}, // budget start date
        {responsivePriority: 14, targets: 4}  // institute
      ]
    };
  }

  nextStep(event, grant): void {
    this.requestModel.grant = grant;
    this.router.navigate(['/request/step2']);
  }

  toString(aString: String): string {
    if (!aString) {
      return null;
    } else {
      return aString.toString();
    }
  }

  validFilter(): boolean {
    return !((!this.fyRange.fromFy || !this.fyRange.toFy)
      && (!this.searchWithin)
      && (!this.grantNumberComponent.grantNumberIC || !this.grantNumberComponent.grantNumberSerial));
  }

  search(): void {

    if (this.searchWithin === 'mypf') {
      this.searchCriteria.pdNpnId = ((this.userSessionService.getLoggedOnUser().npnId) as any as string);
    } else {
      this.searchCriteria.pdNpnId = (this.selectedPd as any as string);
    }

    if (this.searchWithin === 'myca') {
      this.searchCriteria.cayCodes = this.userSessionService.getUserCaCodes();
    } else {
      this.searchCriteria.cayCodes = this.selectedCas;
    }
    this.searchCriteria.fromFy = this.fyRange.fromFy;
    this.searchCriteria.toFy = this.fyRange.toFy;
    this.searchCriteria.fromCouncilMeetingDate = this.ncabRange.fromNcab;
    this.searchCriteria.toCouncileMeetingDate = this.ncabRange.toNcab;
    this.searchCriteria.applStatusGroupCode = this.i2Status;
    this.searchCriteria.piName = this.piName;

    this.searchCriteria.rfaPa = this.selectedRfaPa;

    this.searchCriteria.grantType = this.toString(this.grantNumberComponent.grantNumberType);
    this.searchCriteria.grantMech = this.toString(this.grantNumberComponent.grantNumberMech);
    this.searchCriteria.grantIc = this.toString(this.grantNumberComponent.grantNumberIC);
    this.searchCriteria.grantSerial = this.toString(this.grantNumberComponent.grantNumberSerial);
    this.searchCriteria.grantYear = this.toString(this.grantNumberComponent.grantNumberYear);
    this.searchCriteria.grantSuffix = this.toString(this.grantNumberComponent.grantNumberSuffix);

    //  this.searchCriteria.cayCodes=(this.selectedCays)?this.selectedCays.split(','):[];
    console.log('grant search criteria', this.searchCriteria);
    this.fsRequestControllerService.searchGrantsUsingPOST(this.searchCriteria).subscribe(
      result => {
        console.log('searchGrantsUsingPOST returned ', result);
        if (this.dataTable) {
          console.log('destroy datatable');
          this.dataTable.destroy();
          this.dataTable = null;
        }
        this.grantList = result;
        setTimeout(() => this.initDatatable(), 0);

      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });
  }

  private initDatatable(): void {
    this.dataTable = $('table#grantDt').DataTable(this.dtOptions);
    this.dataTable.columns.adjust().responsive.recalc();
  }

  clear(): void {
    this.searchWithin = '';
    this.piName = '';
    this.fyRange = {fromFy: '', toFy: ''};
    this.ncabRange = {fromNcab: '', toNcab: ''};
    this.selectedPd = undefined;
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

  showHideAdvanced(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  actionDisabled(grant: NciPfrGrantQueryDto): boolean {
    if (grant.applTypeCode === '3' || this.disabledStatuses.indexOf(grant.applStatusGroupCode) !== -1) {
      return true;
    } else {
      return false;
    }
  }

  disabledTooltip(grant: NciPfrGrantQueryDto): string {
    if (grant.applTypeCode === '3') {
      return 'Select the parent grant to request supplements';
    } else {
      return 'Grant Application is in the ' + grant.applStatusGroupDescrip +
        ' IMPAC II status and cannot be selected for requesting funds.';
    }
  }


}


