import { Injectable } from '@angular/core';
import { FsSearchControllerService, FundingRequestQueryDto } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { AppUserSessionService } from 'src/app/service/app-user-session.service';

@Injectable()
export class BatchApproveService {
  constructor(private searchController: FsSearchControllerService,
              private userService: AppUserSessionService,
              private logger: NGXLogger) { }

  private frqIds: number[];
  private fprIds: number[];
  private doc: boolean;
  private spl: boolean;

  initialize(): void {
    this.fprIds = [];
    this.frqIds = [];
    this.doc = false;
    this.spl = false;
    this.searchController.getWaitingDocSplApprovalsUsingGET(this.userService.getLoggedOnUser().nihNetworkId).subscribe(
      result => {
        this.frqIds = result.filter( dto => dto.frqId > 0 ).map( dto => dto.frqId);
        this.fprIds = result.filter( dto => dto.fprId > 0 ).map( dto => dto.fprId);
        if (result && result.length > 0) {
          this.doc = result[0].roleCode === 'DOC';
          this.spl = result[0].roleCode === 'SPL';
        }
        this.logger.debug('frqIds=' + this.frqIds + ' fprIds=' + this.fprIds + ' doc=' + this.doc + ' spl=' + this.spl);
      },
      error => {
        this.logger.error('getWaitingDocSplApprovals errored out, ', error);
      }
    );
  }

  isDoc(): boolean {
    return this.doc;
  }

  isSpl(): boolean {
    return this.spl;
  }

  canApproveRequest(frqId: number): boolean {
    this.logger.debug('this.frqIds ', this.frqIds, frqId );
    return this.frqIds.includes(frqId);
  }

  canApprovePlan(fprId: number): boolean {
    return this.fprIds.includes(fprId);
  }

  canBatchApproveRequest(): boolean {
    return (this.isDoc || this.isSpl) && this.frqIds?.length > 1;
  }

  canBatchApprovePlan(): boolean {
    return (this.isDoc || this.isSpl) && this.fprIds?.length > 1;
  }

}
