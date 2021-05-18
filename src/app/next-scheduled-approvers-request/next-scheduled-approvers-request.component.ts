import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {Options} from 'select2';

@Component({
  selector: 'app-next-scheduled-approvers-request',
  templateUrl: './next-scheduled-approvers-request.component.html',
  styleUrls: ['./next-scheduled-approvers-request.component.css']
})
export class NextScheduledApproversRequestComponent implements OnInit {
  @Input() label = 'Add Approver';
  options: Options;

  @Input()
  get selectedValue(): string {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<string>();

  set selectedValue(value: string) {
    this._selectedValue = value;
    this.selectedValueChange.emit(value);
  }

  private _selectedValue: string;
  approvers: any;

  constructor(private requestModel: RequestModel) {
  }

  ngOnInit(): void {
  }

}
