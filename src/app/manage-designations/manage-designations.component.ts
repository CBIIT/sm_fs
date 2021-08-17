import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {NgbCalendar, NgbDate, NgbDateAdapter, NgbDateParserFormatter, NgbDateStruct} from "@ng-bootstrap/ng-bootstrap";
import {DatepickerAdapter, DatepickerFormatter} from "../datepicker/datepicker-adapter-formatter";
import {NGXLogger} from "ngx-logger";
import {DataTableDirective} from "angular-datatables";
import {Subject} from "rxjs";
import {NgForm} from "@angular/forms";

@Component({
  selector: 'app-manage-designations',
  templateUrl: './manage-designations.component.html',
  styleUrls: ['./manage-designations.component.css'],
  providers: [
    {provide: NgbDateParserFormatter, useClass: DatepickerFormatter}
  ]
})
export class ManageDesignationsComponent implements OnInit, AfterViewInit {

  constructor(private logger: NGXLogger,
              private calendar: NgbCalendar) { }

  @ViewChild(DataTableDirective, {static: false}) dtElement: DataTableDirective;
  @ViewChild('form') newDesigneeForm: NgForm;

  dsTemporary: boolean = false;

  startDate: NgbDateStruct;
  endDate: NgbDateStruct;
  minDate: NgbDate = this.calendar.getToday();

  dtTrigger: Subject<any> = new Subject();
  dtOptions: any = {};

  ngOnInit(): void {
    this.dtOptions = {
      paging: false,
      data: [],
      columns: [
        {title: 'Designee', data: 'name'}, //0
        {title: 'Organization Name', data: 'orgName'}, //1
        {title: 'Start Date', data: 'startDate'}, //2
        {title: 'End Date', data: 'endDate'}, //3
        {title: 'Action', data: null} //4
      ],
      columnDefs: [
      ],
      dom: '<"dt-controls"<"ml-auto"B<"d-inline-block">>>rt<"dt-controls"<"mr-auto"i>>',
      buttons: [
      ]
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.dtTrigger.next(), 0);
  }

  addDesignee() {
    console.debug(this.newDesigneeForm);
    this.logger.debug(this.newDesigneeForm.value);
//    this.logger.debug('Added:', this.startDate, this.endDate);
  }

  onPermanent() {
    this.startDate = null;
    this.endDate = null;
    const savedName = this.newDesigneeForm.value['name'];
    this.newDesigneeForm.resetForm();
    this.newDesigneeForm.form.patchValue({name: savedName});
  }

  onTemporary() {
    const savedName = this.newDesigneeForm.value['name'];
    this.newDesigneeForm.resetForm();
    this.newDesigneeForm.form.patchValue({name: savedName});
  }
}
