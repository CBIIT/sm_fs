import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import {
  FsLookupControllerService,
  FsPlanWorkflowControllerService,
  FundingPlanGrantsDto,
  GmActiveSpecialistsDto,
  GmInfoDto
} from '@cbiit/i2efsws-lib';
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
    this.lookupService.getGmActiveSpecialists().subscribe(
      result => {
        if (result) {
          this.logger.debug('getGmActiveSpecialists returned', result);
          this.specialists = result.map( (data) =>
          ({id: String(data.specNpeId), text: data.specFullName}));
          this.specialistMap = result.reduce((map, specialist) => {
            map.set(specialist.specNpeId, specialist);
            return map;
          }, this.specialistMap);
        }
        this.loadData();
      },
      error => {
        this.logger.error('getGmActiveSpecialists failed', error);
      }
  );
  }

  loadData(): void {
      this.workflowService.getPlanGmInfo(this.planModel.fundingPlanDto.fprId).subscribe(
          result => {
            if (result) {
              this.proposedGrants = result;
              this.logger.debug('getPlanGmInfo returned', result);
              this.checkDefaultSpecialist();
            }
          },
          error => {
            this.logger.error('getDefaultGmInfo failed', error);
          }
        );
      // }
  }

  checkDefaultSpecialist(): void {
    // check if the default specialist returned from backend is no longer active, i.e. not in the drop down list.
    if (this.proposedGrants && this.proposedGrants.length > 0 && this.editable) {
      for ( const gmInfo of this.proposedGrants) {
        const spec = this.specialistMap.get(Number(gmInfo.pfrSpecNpeId));
        if (!spec ) {
          this.logger.warn('The default specialist (npe_id=' + gmInfo.pfrSpecNpeId + ') is not active, treat as invalid to force user to select');
          gmInfo.pfrSpecNpeId = null;
        }
      }
    }
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
      gmInfo.defaultSpecFullName = spec?.specFullName;
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
