import { Injectable } from '@angular/core';
import { FsSearchControllerService } from '@nci-cbiit/i2ecws-lib';
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

  canUserApproveRequest(frqId: number): boolean {
    return this.frqIds.includes(frqId);
  }

  canUserApprovePlan(fprId: number): boolean {
    return this.fprIds.includes(fprId);
  }
}