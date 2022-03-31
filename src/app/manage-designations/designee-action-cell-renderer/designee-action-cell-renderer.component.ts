import { Component, Input, OnInit, Output } from '@angular/core';
import { Subject } from "rxjs";
import { FundingRequestPermDelDto } from "@cbiit/i2ecws-lib/model/fundingRequestPermDelDto";

@Component({
  selector: 'app-designee-action-cell-renderer',
  templateUrl: './designee-action-cell-renderer.component.html',
  styleUrls: ['./designee-action-cell-renderer.component.css']
})
export class DesigneeActionCellRendererComponent implements OnInit {

  constructor() { }

  @Input()
  data: FundingRequestPermDelDto = {};

  @Output()
  editEmitter = new Subject<number>();
  @Output()
  deleteEmitter = new Subject<number>();
  @Output()
  reactivateEmitter = new Subject<number>();

  editable: boolean = false;
  canReactivate: boolean = false;

  ngOnInit(): void {
    // this.editable = !(this.data.newNedOrg || this.data.newClassification || this.data.inactiveNedDate || this.data.inactiveI2eDate);
    this.editable = !(this.data.newNedOrg || this.data.newClassification || this.data.inactiveNedDate || this.data.inactiveI2eDate) && !!this.data.delegateToDate;
    this.canReactivate = this.data.newNedOrg && !(this.data.newClassification || this.data.inactiveNedDate && this.data.inactiveI2eDate);
  }

  onEdit() {
    this.editEmitter.next(this.data.id);
  }

  onDelete() {
    this.deleteEmitter.next(this.data.id);
  }

  onReactivate() {
    this.reactivateEmitter.next(this.data.id);
  }

  ngOnDestroy() {
    this.editEmitter.unsubscribe();
    this.deleteEmitter.unsubscribe();
    this.reactivateEmitter.unsubscribe();
    // console.debug('ngOnDestroy', this.data);
  }
}
