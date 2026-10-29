import { Component, Input } from '@angular/core';
import { formatNciDecision, NciDecisionGrant } from '../../utils/funding-submission-format';

@Component({
  selector: 'app-nci-decision-cell-renderer',
  templateUrl: './nci-decision-cell-renderer.component.html'
})
export class NciDecisionCellRendererComponent {
  @Input() data: NciDecisionGrant = null;

  get decisionDisplay(): string {
    return formatNciDecision(this.data);
  }
}