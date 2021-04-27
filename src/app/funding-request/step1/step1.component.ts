import {AfterViewInit, Component, Inject, OnInit, ViewChild} from '@angular/core';
import {Router} from '@angular/router';
import {FsRequestControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {DataTableDirective} from 'angular-datatables';
import {Subject} from 'rxjs';
import {AppPropertiesService} from 'src/app/service/app-properties.service';
import {GrantsSearchFilterService} from '../grants-search/grants-search-filter.service';
import {RequestModel} from '../../model/request-model';
import {AppUserSessionService} from 'src/app/service/app-user-session.service';

@Component({
  selector: 'app-step1',
  templateUrl: './step1.component.html',
  styleUrls: ['./step1.component.css']
})
export class Step1Component implements OnInit, AfterViewInit {

  @ViewChild(DataTableDirective, {static: false}) myTable: DataTableDirective;

  grantList: NciPfrGrantQueryDto[];


  dtOptions: any;
  dtTrigger: Subject<any> = new Subject();
  showAdvancedFilters: boolean = false;
  piName: string;
  searchWithin: string;
  // TODO: let's figure out how to make some of these global properties
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
        {
          responsivePriority: 1,
          targets: -2
        }]
    };
  }


  nextStep(event, grant): void {
    this.requestModel.grant = grant;
    this.router.navigate(['/request/step2']);
    // TODO: identify and emit the selected grant
    // TODO: identify and emit the npnId of the current user
  }

  onSearch(): void {

  }

  searchPoolChanged(event: string): void {
    console.log('search pool changed: ' + event);
    this.searchWithin = event;
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
  }

  cayCodeSelected(event): void {
    console.log('CayCode selected', event);
  }

  search(): void {
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

  }

  showHideAdvanced(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }


}
