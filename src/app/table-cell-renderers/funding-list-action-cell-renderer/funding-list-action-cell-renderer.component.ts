import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-funding-list-action-cell-renderer',
  templateUrl: './funding-list-action-cell-renderer.component.html',
  styleUrls: ['./funding-list-action-cell-renderer.component.css']
})
export class FundingListActionCellRendererComponent {
  @Input() data: any;
  @Output() viewList = new EventEmitter<any>();

  onViewListClick(event: Event): void {
    event.preventDefault();
    this.viewList.emit(this.data);
  }
}
