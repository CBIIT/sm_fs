import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { FsLookupControllerService, FsWorkflowControllerService, GmActiveSpecialistsDto, GmInfoDto } from '@nci-cbiit/i2ecws-lib';
import { Select2OptionData } from 'ng-select2';
import { NGXLogger } from 'ngx-logger';
import { Subscription } from 'rxjs';
import { RequestModel } from 'src/app/model/request/request-model';
import { FundingRequestIntegrationService } from '../../integration/integration.service';
import { WorkflowModel } from '../workflow.model';

@Component({
  selector: 'app-gm-info',
  templateUrl: './gm-info.component.html',
  styleUrls: ['./gm-info.component.css']
})
export class GmInfoComponent implements OnInit, OnDestroy {
  @Input() approvingState = false;
  @ViewChild('gmform', {static: false}) gmform: NgForm;

  options: any = {};
  gmInfo: GmInfoDto = {};
  specialistMap: Map<number, GmActiveSpecialistsDto> = new Map<number, GmActiveSpecialistsDto>();
  specialists: Select2OptionData[];
  requestSubcription: Subscription;

  isApprovalAction = false;

  constructor(private workflowService: FsWorkflowControllerService,
              private requestModel: RequestModel,
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
      this.workflowService.getDefaultGmInfoUsingGET(this.requestModel.requestDto.frqId).subscribe(
          result => {
            if (result) {
              this.gmInfo = result;
              this.logger.debug('getDefaultGmInfoUsingGET returned', JSON.stringify(result));
            }
            else {
              this.gmInfo = {};
              this.gmInfo.frqId = this.requestModel.requestDto.frqId;
              this.gmInfo.actionType = this.requestModel.requestDto.defaultActionType.toUpperCase();
              }
          },
          error => {
            this.logger.error('getDefaultGmInfoUsingGET failed', error);
          }
        );
  }

  getGmInfo(): GmInfoDto {
    if (this.gmInfo.defaultSpecNpeId) {
      this.logger.debug('spec npe id', this.gmInfo.defaultSpecNpeId);
      const spec = this.specialistMap.get(Number(this.gmInfo.defaultSpecNpeId));
      this.logger.debug('specialist ',  spec);
      this.gmInfo.defaultSpecFullName = spec?.specCode + ' ' + spec?.specFullName;
    }
    return this.gmInfo;
  }

  get readonly(): boolean {
    return !(this.workflowModel.isGMApprover && this.approvingState);
  }

  isFormValid(): boolean {
    // check for the case when the default specialist returned from backend is no longer active, i.e. not in the drop down list.
    const spec = this.specialistMap.get(Number(this.gmInfo.defaultSpecNpeId));
    if (!spec) {
      this.logger.warn('The default specialist (npe_id=' + this.gmInfo.defaultSpecNpeId + ') is not active, treat as invalid to force user to select');
      this.gmInfo.defaultSpecNpeId = null;
      return false;
    }
    return this.gmform?.valid;
  }

}
