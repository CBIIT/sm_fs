import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {Options} from 'select2';
import {AppUserSessionService} from '../service/app-user-session.service';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';
import { FsWorkflowControllerService, FundingReqApproversDto } from '@nci-cbiit/i2ecws-lib';
import {NGXLogger} from 'ngx-logger';

const approverMap = new Map<number, any>();

const addedApproverMap = new Map<number, any>();


@Component({
  selector: 'app-next-scheduled-approvers-request',
  templateUrl: './next-scheduled-approvers-request.component.html',
  styleUrls: ['./next-scheduled-approvers-request.component.css']
})
export class NextScheduledApproversRequestComponent implements OnInit {

  @Input() label = 'Add Approver';
  options: Options;

  requestApprovers: FundingReqApproversDto[];

  // @Input()
  // get selectedValue(): number {
  //   return this._selectedValue;
  // }

  // @Output() selectedValueChange = new EventEmitter<number>();

  set selectedValue(value: number) {
    const user = approverMap.get(Number(value));
    // user.role = 'Added by ' + this.userSessionService.getLoggedOnUser().fullNameLF;
    console.log('selected approver for add is ', user);
    // this.approverList.push(user);
    this.saveAdditionalApprover(user);
    // addedApproverMap.set(Number(value), true);
    // this._selectedValue = value;
    // this.selectedValueChange.emit(value);
  }

  private _selectedValue: number;
  approvers: Array<{ id: number; text: '' }>;
  approverList: Array<any> = new Array<any>();

  constructor(private requestModel: RequestModel,
              private userSessionService: AppUserSessionService,
              private workflowControllerService: FsWorkflowControllerService,
              private logger: NGXLogger) {
  }


  storeData(data: any): any {
    const data2 = data.filter( (user) => {
      if (user.classification !== 'EMPLOYEE') {
        return false;
      }
      else if ( addedApproverMap.get(Number(user.id)) ) {
        return false;
      }
      return true;
    });

    data2.forEach(user => {
      approverMap.set(Number(user.id), user);
    });
    console.log(approverMap);
    return data2;

  }

  ngOnInit(): void {
    const callback = this.storeData;
    this.options = {
      allowClear: true,
      minimumInputLength: 2,
      closeOnSelect: true,
      placeholder: '',
      language: {
        inputTooShort(): string {
          return '';
        }
      },
      ajax: {
        url: '/i2ecws/api/v1/fs/lookup/funding-request/approvers/',
        delay: 500,
        type: 'GET',
        data(params): any {
          return {
            term: params.term
          };
        },
        processResults(data): any {
          const data2 = callback(data);
          return {
            results: $.map(data2, user => {
              return {
                id: user.id,
                text: user.fullName,
                user
              };
            })
          };
        }
      }
    };

    if (!this.requestModel.mainApproverCreated) {
      this.createMainApprovers();
    }
    else if ( this.requestModel.recreateMainApproverNeeded) {
      this.workflowControllerService.deleteRequestApproversUsingGET(this.requestModel.requestDto.frqId).subscribe(
        () => {
          this.requestModel.mainApproverCreated = false;
          this.createMainApprovers(); },
        (error) => { console.log('deleteRequestApprovers failed ', error); }
      );
    }
    else {
      this.workflowControllerService.getRequestApproversUsingGET(this.requestModel.requestDto.frqId).subscribe (
        (result) => {
          this.requestModel.mainApproverCreated = true;
          addedApproverMap.clear();
          this.requestApprovers = result;
          this.requestApprovers.forEach ( (approver) => {
            addedApproverMap.set( approver.approverNpnId, true );
          });
          },
          (error) => {
            console.log('Error calling createRequestApprovers', error);
          }
      );
    }
  }

  processApproversResult(result: any): void {
    addedApproverMap.clear();
    this.requestApprovers = result;
    this.requestApprovers.forEach ( (approver) => {
      addedApproverMap.set( approver.approverNpnId, true );
    });
   // this.changeDetection.detectChanges();
    console.log('processApproversResult ', addedApproverMap);
  }

  createMainApprovers(): void {
    console.log('createMainApprovers called');
    const workflowDto = {frqId: this.requestModel.requestDto.frqId, requestorNpeId: this.userSessionService.getLoggedOnUser().npnId };
    this.workflowControllerService.createRequestApproversUsingPOST(workflowDto).subscribe(
        (result) => {
        this.requestModel.mainApproverCreated = true;
        addedApproverMap.clear();
        this.requestApprovers = result;
        this.requestApprovers.forEach ( (approver) => {
          addedApproverMap.set( approver.approverNpnId, true );
        });
        },
        (error) => {
          console.log('Error calling createRequestApprovers', error);
        }
    );
  }

  deleteApprover(id): void {
    this.logger.debug('Remove Approver ID:', id);
    let i = 0;
    let j = 0;
    this.approverList.forEach(d => {
      if (d.id === id) {
        j = i;
      }
      i++;
    });

    this.approverList.splice(j, 1);
    addedApproverMap.delete(Number(id));
  }

  dropped(event: CdkDragDrop<any[]>): void {
    console.log('drag droped', event);
    moveItemInArray(this.requestApprovers, event.previousIndex, event.currentIndex);
  }

  saveAdditionalApprover(user: any): void {
    this.workflowControllerService.saveAdditionalApproverUsingPOST(this.requestModel.requestDto.frqId, user.nciLdapCn).subscribe(
      (result) => {
        addedApproverMap.clear();
        this.requestApprovers = result;
        this.requestApprovers.forEach ( (approver) => {
          addedApproverMap.set( approver.approverNpnId, true );
        });
        },
      (error) => {
        console.log('Error saveAdditionalApproverUsingPOST ', error);
      }
    );
  }

  deleteAdditionalApprover(fraId: number): void {
    this.workflowControllerService.deleteAdditionalApproverUsingPOST(fraId, this.requestModel.requestDto.frqId).subscribe(
      (result) => {
        addedApproverMap.clear();
        this.requestApprovers = result;
        this.requestApprovers.forEach ( (approver) => {
          addedApproverMap.set( approver.approverNpnId, true );
        });
        },
      (error) => {
        console.log('Error saveAdditionalApproverUsingPOST ', error);
      }
    );
  }

}
