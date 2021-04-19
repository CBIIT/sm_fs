import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FsRequestControllerService, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { DataTableDirective } from 'angular-datatables';
import { Subject } from 'rxjs';
import { GrantsSearchFilterService } from '../grants-search/grants-search-filter.service';

@Component({
  selector: 'app-step1',
  templateUrl: './step1.component.html',
  styleUrls: ['./step1.component.css'],
  providers: [GrantsSearchFilterService]
})
export class Step1Component implements OnInit, AfterViewInit {
  @ViewChild(DataTableDirective, {static: false}) myTable:DataTableDirective;
  
  grantList: NciPfrGrantQueryDto[];

  dtOptions: DataTables.Settings = {};
  dtTrigger: Subject<any> = new Subject();

  constructor(private router:Router,
              private gsfs: GrantsSearchFilterService,
              private fsRequestControllerService: FsRequestControllerService) { }

  ngAfterViewInit(): void {
    console.log("mytable is",this.myTable);
   this.dtTrigger.next();
  }


  ngOnInit(): void {
    this.dtOptions = {
      pageLength: 10
    //   data: this.grantList,
    //   columns: [{
    //     title: 'Grant Number',
    //     data: 'fullGrantNum'
    //   }, {
    //     title: 'Project Title',
    //     data: 'projectTitle'
    //   }, {
    //     title: 'I2 Status',
    //     data: 'applStatusCode'
    //   },{
    //     title: 'PI',
    //     data: 'piFullName'
    //   }, {
    //     title: 'Insitution',
    //     data: 'orgName'
    //   },{
    //     title: 'FY',
    //     data: 'fy'
    //   },{
    //     title: 'NCAB Date',
    //     data: 'councilMeetingDate'
    //   }, {
    //     title: 'Pctl',
    //     data: 'irgPercentileNum'
    //   },{
    //     title: 'PriScr',
    //     data: 'priorityScoreNum'
    //   }, {
    //     title: 'Action',
    //     data: null
    //   }
    // ]
    };
  }

  nextStep() {
    this.router.navigate(['/request/step2']);
  }

  onSearch() {

  }

  fyRangeChanged(event) {
    console.log("fyRangeChanged", event);
    this.gsfs.setFyRange(event);
  }

  i2StatusChanged(event) {
    console.log("i2StatusChanged", event);
    this.gsfs.setI2Status(event);
  }

  search() {
    console.log("grant search criteria", this.gsfs.getGrantsSearchCriteria());
    this.fsRequestControllerService.searchGrantsUsingPOST(this.gsfs.getGrantsSearchCriteria()).subscribe(
        result =>  {
          console.log('searchPaylinePaylistGrantsUsingPOST1 returned ', result);
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

  clear() {

  }


}
