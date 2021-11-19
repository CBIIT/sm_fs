import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { FsLookupControllerService, FsPlanWorkflowControllerService, FundingPlanGrantsDto, GmActiveSpecialistsDto, GmInfoDto } from '@nci-cbiit/i2ecws-lib';
import { Select2OptionData } from 'ng-select2';
import { NGXLogger } from 'ngx-logger';
import { Subscription } from 'rxjs';
import { FundingRequestIntegrationService } from 'src/app/funding-request/integration/integration.service';
import { WorkflowModel } from 'src/app/funding-request/workflow/workflow.model';
import { PlanModel } from 'src/app/model/plan/plan-model';


@Component({
  selector: 'app-fp-grant-management',
  templateUrl: './fp-grant-management.component.html',
  styleUrls: ['./fp-grant-management.component.css']
})
export class FpGrantManagementComponent implements OnInit, OnDestroy {

  @Input() approvingState = false;
  @ViewChild('gmform', {static: false}) gmform: NgForm;

  options: any = {};
  specialistMap: Map<number, GmActiveSpecialistsDto> = new Map<number, GmActiveSpecialistsDto>();
  specialists: Select2OptionData[];
  requestSubcription: Subscription;
  proposedGrants: FundingPlanGrantsDto[];

  isApprovalAction = false;

  grantViewerUrl: string = this.planModel.grantViewerUrl;
  eGrantsUrl: string = this.planModel.eGrantsUrl;

  constructor(private workflowService: FsPlanWorkflowControllerService,
              private planModel: PlanModel,
              private workflowModel: WorkflowModel,
              private lookupService: FsLookupControllerService,
              private requestIntegrationService: FundingRequestIntegrationService,
              private logger: NGXLogger) { }

  ngOnDestroy(): void {
    if (this.requestSubcription) {
      this.requestSubcription.unsubscribe();
    }
  }

  ngOnInit(): void {
    this.requestSubcription = this.requestIntegrationService.requestSubmissionEmitter.subscribe(
      () => {
        this.loadData();
      }
    );
    this.loadData();
    this.lookupService.getGmActiveSpecialistsUsingGET().subscribe(
      result => {
        if (result) {
          this.logger.debug('getGmActiveSpecialistsUsingGET returned', result);
          this.specialists = result.map( (data) =>
          ({id: String(data.specNpeId), text: data.specCode + ' ' + data.specFullName}));
          this.specialistMap = result.reduce((map, specialist) => {
            map.set(specialist.specNpeId, specialist);
            return map;
          }, this.specialistMap);
        }
      },
      error => {
        this.logger.error('getGmActiveSpecialistsUsingGET failed', error);
      }
  );
  }

  loadData(): void {
      this.workflowService.getPlanGmInfoUsingGET(this.planModel.fundingPlanDto.fprId).subscribe(
          result => {
            if (result) {
              this.proposedGrants = result;
              this.logger.debug('getPlanGmInfoUsingGET returned', result);
            }
          },
          error => {
            this.logger.error('getDefaultGmInfoUsingGET failed', error);
          }
        );
      // }
  }

  getGmInfos(): GmInfoDto[] {
    const gmInfos: GmInfoDto[] = [];
    for (const grant of this.proposedGrants) {
      const gmInfo: GmInfoDto = {};
      gmInfo.frqId = grant.frqId;
      gmInfo.actionType = 'AWARD';
      gmInfo.bkupSpecNpeId = grant.pfrBkupSpecNpeId;
      gmInfo.defaultSpecNpeId = grant.pfrSpecNpeId;
      const spec = this.specialistMap.get(Number(grant.pfrSpecNpeId));
      this.logger.debug('spec',  this.specialistMap.get(22180));
      gmInfo.defaultSpecFullName = spec.specCode + ' ' + spec.specFullName;
      gmInfos.push(gmInfo);
    }
    return gmInfos;
  }

  get editable(): boolean {
    return (this.workflowModel.isGMApprover && this.approvingState);
  }

  isFormValid(): boolean {
    return this.gmform?.valid;
  }

  isFormDirty(): boolean {
    return this.gmform.dirty;
  }

}
