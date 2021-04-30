import {AfterViewInit, Component, Inject, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {DataTableDirective} from 'angular-datatables';
import {Subject} from 'rxjs';
import {AppPropertiesService} from 'src/app/service/app-properties.service';
import {GrantsSearchFilterService} from '../grants-search/grants-search-filter.service';
import {RequestModel} from '../../model/request-model';
import {AppUserSessionService} from 'src/app/service/app-user-session.service';
import { GrantnumberSearchCriteriaComponent } from '@nci-cbiit/i2ecui-lib';

@Component({
  selector: 'app-step1',
  templateUrl: './step1.component.html',
  styleUrls: ['./step1.component.css']
})
export class Step1Component implements OnInit, AfterViewInit {

  @ViewChild(DataTableDirective, {static: false}) myTable: DataTableDirective;
  @ViewChild(GrantnumberSearchCriteriaComponent) grantNumberComponent: GrantnumberSearchCriteriaComponent;
 

  grantList: NciPfrGrantQueryDto[];


//  dtOptions:  DataTables.Settings;
  dtOptions: any;
  dtTrigger: Subject<any> = new Subject();
  showAdvancedFilters: boolean = false;
  //search criteria values
  piName: string;
  searchWithin: string;
  fyRange:any={};
  ncabRange:any={};
  selectedPd:string;
  selectRfaPa:string;
  i2Status:string;
  selectedCas:string[]=[];

 
  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');

  constructor(private router: Router,
              private gsfs: GrantsSearchFilterService,
              private fsRequestControllerService: FsRequestControllerService,
              private propertiesService: AppPropertiesService,
              private requestModel: RequestModel) {
  }

  ngAfterViewInit(): void {
    console.log('mytable is', this.myTable);
    this.dtTrigger.next();
  }


  ngOnInit(): void {
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
        {responsivePriority: 1,targets: 0 }, //grant_num
        {responsivePriority: 2,targets: 13 }, //action
        {responsivePriority: 3,targets: 3 }, //pi
        {responsivePriority: 4,targets: 6 }, //ncab
        {responsivePriority: 5,targets: 5 }, //fy
        {responsivePriority: 6,targets: 10 }, //pd
        {responsivePriority: 7,targets: 9 }, //ca
        {responsivePriority: 8,targets: 7 }, //pctl
        {responsivePriority: 9,targets: 8 },//priscr
        {responsivePriority: 10,targets: 12 }, //existing requests
        {responsivePriority: 11,targets: 2 }, // i2 status
        {responsivePriority: 12,targets: 1 }, // project title
        {responsivePriority: 13,targets: 11 }, //budget start date
        {responsivePriority: 14,targets: 4 }  // institute
      ]
    };
  }


  nextStep(event, grant): void {
    this.requestModel.grant = grant;
    this.router.navigate(['/request/step2']);
    // TODO: identify and emit the selected grant
    // TODO: identify and emit the npnId of the current user
  }

  searchPoolChanged(event: string): string {
    console.log('search pool changed: ' + event);
    if (event)
      this.searchWithin = event;

    return this.searchWithin;
  }

  fyRangeChanged(event): void {
    console.log('fyRangeChanged', event);
    this.gsfs.setFyRange(event);
  }

  i2StatusChanged(event): void {
    console.log('i2StatusChanged', event);
    this.gsfs.setI2Status(event);
  }

  pdSelected(event: string): void {
    console.log('PD Selected', event);
    this.gsfs.setPdId(event);
  }

  // cayCodeSelected(event): void {
  //   console.log('CayCode selected', event);
  //   this.selectedCays=event;
  // }

  rfaRaSelected(event):void {
    console.log('RFA/PA selected', event);
    this.gsfs.setRfaPa(event);
  }

  ncabToSelected(event):void{
    console.log("NCAB to ", event);
    this.gsfs.getGrantsSearchCriteria().toCouncileMeetingDate=event;
  }

  ncabFromSelected(event):void{
    console.log("NCAB from ", event);
    this.gsfs.getGrantsSearchCriteria().fromCouncilMeetingDate=event;
  }

  toString(aString:String):string{
    if (!aString)
      return null;
    else
      return aString.toString();
  }

  search(): void {
    console.log("searchWithin="+this.searchWithin);
    this.gsfs.getGrantsSearchCriteria().grantType = this.toString(this.grantNumberComponent.grantNumberType);
    this.gsfs.getGrantsSearchCriteria().grantMech = this.toString(this.grantNumberComponent.grantNumberMech);
    this.gsfs.getGrantsSearchCriteria().grantIc = this.toString(this.grantNumberComponent.grantNumberIC);
    this.gsfs.getGrantsSearchCriteria().grantSerial = this.toString(this.grantNumberComponent.grantNumberSerial);
    this.gsfs.getGrantsSearchCriteria().grantYear= this.toString(this.grantNumberComponent.grantNumberYear);
    this.gsfs.getGrantsSearchCriteria().grantSuffix= this.toString(this.grantNumberComponent.grantNumberSuffix);
    
    // this.gsfs.getGrantsSearchCriteria().cayCodes=(this.selectedCays)?this.selectedCays.split(','):[];
    console.log('grant search criteria', this.gsfs.getGrantsSearchCriteria());
    this.fsRequestControllerService.searchGrantsUsingPOST(this.gsfs.getGrantsSearchCriteria()).subscribe(
      result => {
        console.log('searchGrantsUsingPOST returned ', result);
        this.grantList = result;
        // this.dtTrigger.next();
        this.myTable.dtInstance.then((dtInstance: DataTables.Api) => {
          // Destroy the table first
        dtInstance.destroy();
          // Call the dtTrigger to rerender again
        this.dtTrigger.next();
        });

      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });
  }

  clear(): void {
    this.searchWithin='';
  }

  showHideAdvanced(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }


}
