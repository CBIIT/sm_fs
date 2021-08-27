import {AfterViewInit, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {
  NgbCalendar,
  NgbDate,
  NgbDateAdapter,
  NgbDateParserFormatter,
  NgbDateStruct,
  NgbModal
} from "@ng-bootstrap/ng-bootstrap";
import {DatepickerAdapter, DatepickerFormatter} from "../datepicker/datepicker-adapter-formatter";
import {NGXLogger} from "ngx-logger";
import {DataTableDirective} from "angular-datatables";
import {Subject} from "rxjs";
import {NgForm} from "@angular/forms";
import {FsDesigneeControllerService} from "@nci-cbiit/i2ecws-lib";
import {AppUserSessionService} from "../service/app-user-session.service";
import {DesigneeCellRendererComponent} from "./designee-cell-renderer/designee-cell-renderer.component";
import {DesigneeActionCellRendererComponent} from "./designee-action-cell-renderer/designee-action-cell-renderer.component";
import {EditDesigneeModalComponent} from "./edit-designee-modal/edit-designee-modal.component";
import {FundingRequestPermDelDto} from "@nci-cbiit/i2ecws-lib/model/fundingRequestPermDelDto";
import {Options} from "select2";
import {Select2OptionData} from "ng-select2";

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
              private calendar: NgbCalendar,
              private userSessionService: AppUserSessionService,
              private designeeService: FsDesigneeControllerService,
              private modalService: NgbModal) { }

  @ViewChild(DataTableDirective, {static: false}) dtElement: DataTableDirective;
  @ViewChild('designeeRenderer') designeeRenderer: DesigneeCellRendererComponent;
  @ViewChild('actionDesigneeRenderer') actionRenderer: DesigneeActionCellRendererComponent;
  @ViewChild('form') newDesigneeForm: NgForm;

  dsTemporary: boolean = false;

  startDate: NgbDateStruct;
  endDate: NgbDateStruct;
  minDate: NgbDate = this.calendar.getToday();

  dtTrigger: Subject<any> = new Subject();
  dtOptions: any = {};
  dtData: FundingRequestPermDelDto[] = [];
  nameSelect2Options: Options;
  ng2Data: Select2OptionData[] = [];
  ng2Options: Options = {
    minimumInputLength: 2,
    closeOnSelect: true,
    placeholder: 'Enter Last Name, First Name',
    language: {
      inputTooShort(): string {
        return '';
      }
    }
  }

  ngOnInit(): void {

    this.nameSelect2Options = {
      allowClear: true,
      minimumInputLength: 2,
      closeOnSelect: true,
      placeholder: 'Enter Last Name, First Name',
      language: {
        inputTooShort(): string {
          return '';
        }
      },
      ajax: {
        url: '/i2ecws/api/v1/fs/lookup//funding-request/approvers/',
        delay: 500,
        type: 'GET',
        data(params): any {
          return { 'term': params.term }
        },
        processResults: this.select2processResults.bind(this),
        //TODO - error handling
        error: (error) => { console.error(error); alert(error.responseText)}
      }
    };
  }

  private select2processResults(data: any): any {
    console.debug('Results', data);
    const results = $.map(data , entry => {
      return {
        id: entry.nciLdapCn,
        text: entry.fullNameLdap,
        additional: entry
      };
    });
    return {
      // Filter already selected designee from the list
      results: results.filter((entry) => {
        for (let dtEntry of this.dtData) {
          if (dtEntry.delegateTo === entry.id) {
            return false;
          }
        }
        return true;
      })
    };
  }



  ngAfterViewInit(): void {
    this.dtOptions = {
      paging: false,
      language: { emptyTable: 'No designees selected'},
      ajax: (dataTablesParameters: any, callback) => {
        this.designeeService.getAllApproverDesigneesUsingGET(this.userSessionService.getLoggedOnUser().nihNetworkId).subscribe(
          result => {
            this.logger.debug('Get designees for user: ', result);
            this.dtData = result;
            callback({
              recordsTotal: result.length,
              recordsFiltered: result.length,
              data: result
            });
          }, error => {
            this.logger.error('HttpClient get request error for----- ' + error.message);
          });
      },
      columns: [
        {title: 'Designee', data: 'delegateToFullName', ngTemplateRef: { ref: this.designeeRenderer }}, //0
        {title: 'Organization Name', data: 'currentNedOrg'}, //1
        {title: 'Start Date', data: 'delegateFromDate'}, //2
        {title: 'End Date', data: 'delegateToDate'}, //3
        {title: 'Action', data: null, ngTemplateRef: { ref: this.actionRenderer}} //4
      ],
      columnDefs: [
      ],
      dom: '<"dt-controls"<"ml-auto"B<"d-inline-block">>>rt<"dt-controls"<"mr-auto"i>>',
      buttons: [
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
    }
    setTimeout(() => this.dtTrigger.next(), 0);
  }

  addDesignee() {
    console.debug('The form is ', this.newDesigneeForm.valid);
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

  onEditDesignee($event: number) {
    for (let entry of this.dtData) {
      if (entry.id === $event) {
        const modalRef = this.modalService.open(EditDesigneeModalComponent, { size: "lg"});
        modalRef.componentInstance.data = entry;
        modalRef.result.then((result: any) => {
          console.debug('Result: ', result);
        }).finally(() => console.debug('Finally closing dialog'));
        break;
      }
    }
  }
}
