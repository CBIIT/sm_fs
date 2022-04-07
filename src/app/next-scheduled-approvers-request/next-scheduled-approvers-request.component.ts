import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { Options } from 'select2';
import { AppUserSessionService } from '../service/app-user-session.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { FsWorkflowControllerService, FundingReqApproversDto } from '@cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

const approverMap = new Map<number, any>();

const addedApproverMap = new Map<number, any>();


@Component({
  selector: 'app-next-scheduled-approvers-request',
  templateUrl: './next-scheduled-approvers-request.component.html',
  styleUrls: ['./next-scheduled-approvers-request.component.css']
})
export class NextScheduledApproversRequestComponent implements OnInit {

  @Input() label = 'Add Approver';
  @Input() readonly = false;
  @Output() activeApprover = new EventEmitter<FundingReqApproversDto>();

  options: Options;

  mainApprovers: FundingReqApproversDto[];
  additionalApprovers: FundingReqApproversDto[];

  private iSelectedValue: number;

  set selectedValue(value: number) {
    this.iSelectedValue = value;
    const user = approverMap.get(Number(value));
    this.logger.debug('Selected Approver to Add: ', user);
    this.saveAdditionalApprover(user);
    setTimeout(() => {this.iSelectedValue = null; this.approvers = []; }, 0);
  }

  get selectedValue(): number {
    return this.iSelectedValue;
  }


  private _selectedValue: number;
  approvers: Array<{ id: number; text: '' }>;

  constructor(public requestModel: RequestModel,
              private userSessionService: AppUserSessionService,
              private workflowControllerService: FsWorkflowControllerService,
              private logger: NGXLogger) {
  }
  storeData(data: any): any {
    const data2 = data.filter((user) => {
      if (user.classification !== 'EMPLOYEE') {
        return false;
      }
      else if (addedApproverMap.get(Number(user.id))) {
        return false;
      }
      return true;
    });

    data2.forEach(user => {
      approverMap.set(Number(user.id), user);
    });
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
        type: 'POST',
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
    else if (this.requestModel.recreateMainApproverNeeded) {
      this.logger.debug('needs to recreate main approvers because of changes in funding request');
      this.workflowControllerService.deleteRequestApprovers(this.requestModel.requestDto.frqId).subscribe(
        () => {
          this.requestModel.mainApproverCreated = false;
          this.createMainApprovers();
        },
        (error) => { this.logger.error('deleteRequestApprovers failed ', error); }
      );
    }
    else {
      this.workflowControllerService.getRequestApprovers(this.requestModel.requestDto.frqId).subscribe(
        (result) => {
          this.processApproversResult(result);
          this.requestModel.captureApproverCriteria();
        },
        (error) => {
          this.logger.error('Error calling createRequestApprovers', error);
        }
      );
    }
  }

  processApproversResult(result: any): void {
    addedApproverMap.clear();
    result.forEach((approver) => {
      addedApproverMap.set(approver.approverNpnId, true);
    });

    this.mainApprovers = result.filter((approver) => {
      return approver.roleCode !== null;
    });

    this.additionalApprovers = result.filter((approver) => {
      return approver.roleCode === null;
    });

    this.activeApprover.emit(result.length > 0 ? result[0] : null);
  }

  createMainApprovers(): void {
    const workflowDto = { frqId: this.requestModel.requestDto.frqId, requestorNpeId: this.requestModel.requestDto.requestorNpeId};
    this.workflowControllerService.createRequestApprovers(workflowDto).subscribe(
      (result) => {
        this.requestModel.mainApproverCreated = true;
        this.requestModel.captureApproverCriteria();
        this.processApproversResult(result);
        this.logger.debug('Main approvers are created: ', result);
      },
      (error) => {
        this.logger.error('Error calling createRequestApprovers', error);
      }
    );
  }

  dropped(event: CdkDragDrop<any[]>): void {
   // moveItemInArray(this.requestApprovers, event.previousIndex, event.currentIndex);
   if (event.previousIndex === event.currentIndex) {
     return;
   }
   this.workflowControllerService.moveAdditionalApprover(
     event.currentIndex + 1, this.requestModel.requestDto.frqId, event.previousIndex + 1).subscribe(
      (result) => { this.processApproversResult(result); },
      (error) => {
        this.logger.error('Error moveAdditionalApprover ', error);
      }
     );
  }

  saveAdditionalApprover(user: any): void {
    this.workflowControllerService.saveAdditionalApprover(
      this.requestModel.requestDto.frqId,
      this.userSessionService.getLoggedOnUser().nihNetworkId,
      user.nciLdapCn).subscribe(
      (result) => { this.processApproversResult(result); },
      (error) => {
        this.logger.error('Error saveAdditionalApprover ', error);
      }
    );
  }

  deleteAdditionalApprover(fraId: number): void {
    this.workflowControllerService.deleteAdditionalApprover(fraId, this.requestModel.requestDto.frqId).subscribe(
      (result) => { this.processApproversResult(result); },
      (error) => {
        this.logger.error('Error saveAdditionalApprover ', error);
      }
    );
  }

}
