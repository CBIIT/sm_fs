import { Component, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { CancerActivityControllerService, FundingPlanFoasDto } from '@cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { ControlContainer, NgForm } from '@angular/forms';
import { PlanInfoIssueTypeComponent } from '../plan-info-issue-type/plan-info-issue-type.component';

@Component({
  selector: 'app-funding-plan-information',
  templateUrl: './funding-plan-information.component.html',
  styleUrls: ['./funding-plan-information.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class FundingPlanInformationComponent implements OnInit {
  @ViewChildren(PlanInfoIssueTypeComponent) planFoaDetails: QueryList<PlanInfoIssueTypeComponent>;
  @Input() parentForm: NgForm;
  @Input() readOnly = false;
  @Input() showAdditionalInfo = false;
  @Input() showPlanName: boolean;

  fundingPlanFoas: FundingPlanFoasDto[];
  totalApplicationsSelected: number;
  totalApplicationsReceived: number;
  totalApplicationsSkipped: number;
  totalApplicationsNotConsidered: number;
  listApplicationsSelected: NciPfrGrantQueryDtoEx[];
  listApplicationsSkipped: NciPfrGrantQueryDtoEx[];
  listApplicationsNotConsidered: NciPfrGrantQueryDtoEx[];
  listApplicationsNotSelectable: NciPfrGrantQueryDtoEx[];
  listApplicationsOutsideRange: NciPfrGrantQueryDtoEx[];
  listApplicationsWithinRange: NciPfrGrantQueryDtoEx[];
  otherDocs: string[];

  loaMap: Map<string, string>;

  constructor(public planModel: PlanModel,
              private rfaService: CancerActivityControllerService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.loaMap = new Map<string, string>()
      .set('PD', 'Program Director')
      .set('DD', 'NCI Director')
      .set('SPL', 'Scientific Program Leaders Committee')
      .set('DAO', 'Division/Office/Center (DOC) Approver');

    if (this.showPlanName === undefined) {
      this.showPlanName = this.showAdditionalInfo;
    }

    this.restoreSavedFoaData();

    this.totalApplicationsReceived = this.planModel.fundingPlanDto.applReceivedNum || this.planModel.allGrants.length;

    this.listApplicationsSelected = this.planModel.allGrants.filter(g => g.selected);

    this.totalApplicationsSelected = this.listApplicationsSelected.length;

    this.listApplicationsWithinRange = this.planModel.allGrants.filter(g =>
      (!g.notSelectableReason || g.notSelectableReason.length === 0)
      && g.priorityScoreNum >= this.planModel.minimumScore && g.priorityScoreNum <= this.planModel.maximumScore);

    this.listApplicationsSkipped = this.listApplicationsWithinRange.filter(g => !g.selected);
    this.totalApplicationsSkipped = this.listApplicationsSkipped.length;

    // Total number of not selectable grants
    this.listApplicationsNotSelectable = this.planModel.allGrants.filter(g => (g.notSelectableReason?.length > 0 && !g.selected));

    this.listApplicationsOutsideRange = this.planModel.allGrants.filter(g =>
      g.priorityScoreNum < this.planModel.minimumScore || g.priorityScoreNum > this.planModel.maximumScore)
      .filter(g => !g.notSelectableReason || g.notSelectableReason.length === 0);

    this.totalApplicationsNotConsidered = this.listApplicationsNotSelectable.length
      + this.listApplicationsOutsideRange.filter(g => !g.selected).length;

    this.listApplicationsNotConsidered = [];
    this.listApplicationsNotConsidered.concat(this.listApplicationsNotSelectable)
      .concat(this.listApplicationsOutsideRange.filter(g => !g.selected));

    if (this.planModel.fundingPlanDto.otherContributingDocs) {
      this.otherDocs = this.planModel.fundingPlanDto.otherContributingDocs.split(',');
    }
  }

  private restoreSavedFoaData(): void {
    if (!!this.planModel?.fundingPlanDto?.fundingPlanFoas && this.planModel.fundingPlanDto.fundingPlanFoas.length > 0) {
      this.fundingPlanFoas = this.planModel.fundingPlanDto.fundingPlanFoas;
      this.fundingPlanFoas.forEach(foa => {
        this.rfaService.getRfaPaNoticeByNoticeNumber(foa.rfaPaNumber).subscribe(next => {
          foa.nihGuideAddr = next.nihGuideAddr;
          foa.cptId = next.cptId;
        });
      });
    } else {
      this.fundingPlanFoas = [];
      this.planModel.grantsSearchCriteria.forEach(rfa => {
        this.rfaService.getRfaPaNoticeByNoticeNumber(rfa.rfaPaNumber).subscribe(next => {
          if (next) {
            this.logger.debug(`Prior notice: ${next.priorNoticeNumber}`);
            const tmp: FundingPlanFoasDto = {} as FundingPlanFoasDto;
            tmp.rfaPaNumber = next?.noticeNumber;
            tmp.prevRfaPaNumber = next?.priorNoticeNumber;
            tmp.cptId = next?.cptId;
            tmp.title = next?.title;
            tmp.nihGuideAddr = next?.nihGuideAddr;
            this.fundingPlanFoas.push(tmp);
          }
        });
      });
    }
  }
}
