import {AfterViewInit, Component, Input, OnInit, ViewChild} from '@angular/core';
import {NgbActiveModal, NgbCalendar, NgbDate, NgbDateAdapter, NgbDateParserFormatter} from "@ng-bootstrap/ng-bootstrap";
import {NgForm} from "@angular/forms";
import {FundingRequestPermDelDto} from "@nci-cbiit/i2ecws-lib/model/fundingRequestPermDelDto";
import {DatepickerAdapter, DatepickerFormatter} from "../../datepicker/datepicker-adapter-formatter";

@Component({
  selector: 'app-edit-designee-modal',
  templateUrl: './edit-designee-modal.component.html',
  styleUrls: ['./edit-designee-modal.component.css'],
  providers: [
    {provide: NgbDateParserFormatter, useClass: DatepickerFormatter},
    {provide: NgbDateAdapter, useClass: DatepickerAdapter}
  ]
})
export class EditDesigneeModalComponent implements OnInit, AfterViewInit {

  @ViewChild('editForm') editForm: NgForm;

  @Input() data : FundingRequestPermDelDto = {}

  minDate: NgbDate = this.calendar.getToday();
  startDateReadOnly: boolean = false;

  constructor(public modal: NgbActiveModal,
              private calendar: NgbCalendar) { }

  ngOnInit(): void {
    if (!this.data.delegateFrom) {
      this.data.delegateToFullName = 'Tester Testerman';
      this.data.delegateToEmailAddr = 'noreply@noreply.com';
      this.data.currentNedOrg = "CBIIT OD (ORG TEST INSTITUTE)";
    }
  }

  onSubmit(editForm: NgForm) {
    console.debug(editForm);
    if (editForm.valid) {
      this.modal.close(editForm.value);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.editForm.form.patchValue({
        startDate: this.data.delegateFromDate,
        endDate: this.data.delegateToDate
      });
      let date = this.data.delegateFromDate.toString().split('/');
      const fromDate : NgbDate = NgbDate.from({
        year: parseInt(date[2], 10),
        month: parseInt(date[0], 10),
        day: parseInt(date[1], 10)
      });
      this.startDateReadOnly = this.minDate.after(fromDate);
    }, 0);
  }
}