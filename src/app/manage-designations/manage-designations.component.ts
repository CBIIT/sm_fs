import {AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
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
import {ConfirmDeleteModalComponent} from "./confirm-delete-modal/confirm-delete-modal.component";

@Component({
  selector: 'app-manage-designations',
  templateUrl: './manage-designations.component.html',
  styleUrls: ['./manage-designations.component.css'],
  providers: [
    {provide: NgbDateParserFormatter, useClass: DatepickerFormatter}
  ]
})
export class ManageDesignationsComponent implements OnInit, AfterViewInit, OnDestroy {

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

  errInactiveDesignees: boolean = false;
  successManageDesigneesMsg: string = '';
  successDesignee: FundingRequestPermDelDto;

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
        url: '/i2ecws/api/v1/fs/lookup/funding-request/available-designees/',
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
        text: entry.fullName + ((entry.nedOrgPath && entry.nedOrgPath.length > 0) ? ' [' + entry.nedOrgPath + ']' : ''),
        additional: entry
      };
    });
    return {
      // Filter already selected designee from the list
      results: results.filter((entry) => {
        if (this.userSessionService.getLoggedOnUser().nihNetworkId === entry.id) {
          return false;
        }
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
      data: this.dtData,
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
    setTimeout(() => this.initDesigneeList(), 10);
  }

  ngOnDestroy(): void {
    this.dtTrigger.unsubscribe();
  }

  initDesigneeList() {
    this.designeeService.getAllApproverDesigneesUsingGET(this.userSessionService.getLoggedOnUser().nihNetworkId).subscribe(
      (result: Array<FundingRequestPermDelDto>) => {
        this.logger.debug('Get designees for user: ', result);
        this.dtData = result;
        this.dtOptions.data = this.dtData;
        this.updateErrInactiveDesignees(result);

        if (this.dtElement && this.dtElement.dtInstance) {
          this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
            dtInstance.destroy();
          });
          this.dtTrigger.next();
        }

      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
  }


  updateDesigneeTable(data: FundingRequestPermDelDto[]) {
    this.logger.debug('Get designees for user: ', data);
    this.dtData = data;
    this.dtOptions.data = this.dtData;
    this.updateErrInactiveDesignees(data);

    if (this.dtElement && this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.destroy();
        this.dtTrigger.next();
      });
    }
  }

  updateErrInactiveDesignees(data) {
    for (const entry of data) {
      if (entry.newNedOrg || entry.newClassification || entry.inactiveNedDate || entry.inactiveI2eDate) {
        this.errInactiveDesignees = true;
        return;
      }
    }
  }

  addDesignee() {
    console.debug('The form is ', this.newDesigneeForm.valid);
    this.logger.debug(this.newDesigneeForm.value);
    if (!this.newDesigneeForm.valid) {
      return;
    }
    const fromDate: string = (this.newDesigneeForm.value.startDate) ?
      String(this.newDesigneeForm.value.startDate.month).padStart(2, '0') + '/' +
      String(this.newDesigneeForm.value.startDate.day).padStart(2, '0') + '/' +
      String(this.newDesigneeForm.value.startDate.year).padStart(4, '0')
      : null;
    const toDate: string = (this.newDesigneeForm.value.endDate) ?
      String(this.newDesigneeForm.value.endDate.month).padStart(2, '0') + '/' +
      String(this.newDesigneeForm.value.endDate.day).padStart(2, '0') + '/' +
      String(this.newDesigneeForm.value.endDate.year).padStart(4, '0')
      : null;
    const designeeTo = this.newDesigneeForm.value.name;
    this.designeeService.createDesigneeUsingPOST(
      fromDate, toDate, this.userSessionService.getLoggedOnUser().nihNetworkId, designeeTo).subscribe(
      result => {
        this.updateDesigneeTable(result);
        this.successManageDesigneesMsg = 'Designee has been added successfully.';
        for (const entry of result) {
          if (entry.delegateTo === designeeTo) {
            this.successDesignee = entry;
            break;
          }
        }
      },
      error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      }
    )
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
    const entry = this._getEntryById($event);
    if (entry) {
      const modalRef = this.modalService.open(EditDesigneeModalComponent, { size: "lg"});
      modalRef.componentInstance.data = entry;
      modalRef.result.then((updatedData: any) => {
        console.debug('Result: ', updatedData);
        this.designeeService.updateDesigneeUsingPUT(updatedData.startDate, updatedData.endDate, updatedData.id).subscribe(
          result => {
            this.updateDesigneeTable(result);
            this.successManageDesigneesMsg = 'Designation date(s) have been updated successfully.';
            for (const entry of result) {
              if (entry.id === updatedData.id) {
                this.successDesignee = entry;
                break;
              }
            }
          },
          error => {
            this.logger.error('HttpClient edit designee request error for----- ' + error.message);
          }
        )
      }).finally(() => console.debug('Finally closing dialog'));
    }
  }

  onDeleteDesignee($event: number) {
    const entry = this._getEntryById($event);
    if (entry) {
      const modalRef = this.modalService.open(ConfirmDeleteModalComponent);
      modalRef.componentInstance.data = entry;
      modalRef.result.then((updatedData: any) => {
        console.debug('Result: ', updatedData);
        this.designeeService.deleteDesigneeUsingDELETE($event).subscribe(
          result => {
            this.updateDesigneeTable(result);

            this.successManageDesigneesMsg = 'Designee has been deleted successfully.';
            this.successDesignee = entry;
          },
          error => {
            this.logger.error('HttpClient delete designee request error for----- ' + error.message);
          }
        )
      }).finally(() => console.debug('Finally closing dialog'));
    }
  }

  onReactiveDesignee($event: number) {
    this.designeeService.activateDesigneeUsingPUT($event).subscribe(
      result => {
        this.updateDesigneeTable(result);
        this.successManageDesigneesMsg = 'Designee has been activated successfully.';
        this.successDesignee = this._getEntryById($event);
      },
      error => {
        this.logger.error('HttpClient put designee request error for----- ' + error.message);
      }
    )
  }

  private _getEntryById (id: number) : FundingRequestPermDelDto {
    for (let entry of this.dtData) {
      if (entry.id === id) {
        return entry;
      }
    }
    return null;
  }
}
