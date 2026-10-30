import { Component, Input } from '@angular/core';
import { FundingSubmissionListGrantDto } from '@cbiit/i2efsws-lib';
import { formatNciDecision } from '../../utils/funding-submission-format';

@Component({
  selector: 'app-nci-decision-cell-renderer',
  templateUrl: './nci-decision-cell-renderer.component.html'
})
export class NciDecisionCellRendererComponent {
  @Input() data: FundingSubmissionListGrantDto = null;

  get decisionDisplay(): string {
    return formatNciDecision(this.data);
  }
}