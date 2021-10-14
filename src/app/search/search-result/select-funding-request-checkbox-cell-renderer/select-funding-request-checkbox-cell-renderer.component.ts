import {Component, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {Subject} from 'rxjs';
import { BatchApproveService } from '../../batch-approve/batch-approve.service';

@Component({
  selector: 'app-select-funding-request-checkbox-cell-renderer',
  templateUrl: './select-funding-request-checkbox-cell-renderer.component.html',
  styleUrls: ['./select-funding-request-checkbox-cell-renderer.component.css']
})
export class SelectFundingRequestCheckboxCellRendererComponent implements OnInit, OnDestroy {

  constructor(private batchApproveService: BatchApproveService) { }

  @Input() data: any = {};
  @Input() id = '';

  @Output() emitter = new Subject<any>();

  ngOnInit(): void {
  }

  onSelect($event: any): void {
    this.data.selected = $event.target.checked;
    this.emitter.next(this.data);
  }

  ngOnDestroy(): void {
    this.emitter.unsubscribe();
  }

  canBatchApprove(): boolean {
    if (this.id === 'frqId') {
      return this.batchApproveService.canApproveRequest(this.data.frqId);
    }
    else {
      return this.batchApproveService.canApprovePlan(this.data.fprId);
    }
  }
}
