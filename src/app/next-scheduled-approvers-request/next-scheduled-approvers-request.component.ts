import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {Options} from 'select2';
import {AppUserSessionService} from '../service/app-user-session.service';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';

class Approver {
  id: number;
  text: '';
  user: any;
}

const approverMap = new Map<number, any>();


@Component({
  selector: 'app-next-scheduled-approvers-request',
  templateUrl: './next-scheduled-approvers-request.component.html',
  styleUrls: ['./next-scheduled-approvers-request.component.css']
})
export class NextScheduledApproversRequestComponent implements OnInit {
  @Input() label = 'Add Approver';
  options: Options;

  @Input()
  get selectedValue(): number {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<number>();

  set selectedValue(value: number) {
    const user = approverMap.get(Number(value));
    user.role = 'Added by ' + this.userSessionService.getLoggedOnUser().fullNameLF;
    console.log('additional details:', user);
    this.approverList.push(user);
    this._selectedValue = value;
    this.selectedValueChange.emit(value);
  }

  private _selectedValue: number;
  approvers: Array<{ id: number; text: '' }>;
  approverList: Array<any> = new Array<any>();

  constructor(private requestModel: RequestModel, private userSessionService: AppUserSessionService) {
  }

  storeData(data: any): void {
    console.log('storing data', data);
    data.forEach(user => {
      console.log(user);
      approverMap.set(Number(user.id), user);
    });
    console.log(approverMap);
  }

  ngOnInit(): void {
    const callback = this.storeData;
    this.options = {
      allowClear: true,
      minimumInputLength: 2,
      closeOnSelect: true,
      placeholder: '',
      language: {
        inputTooShort(): string {
          return '';
        }
      },
      ajax: {
        url: '/i2ecws/api/v1/fs/lookup/funding-request/approvers/',
        delay: 500,
        type: 'GET',
        data(params): any {
          return {
            term: params.term
          };
        },
        processResults(data): any {
          callback(data);
          return {
            results: $.map(data, user => {
              return {
                id: user.id,
                text: user.fullName,
                user
              };
            })
          };
        }
      }
    };

  }

  deleteApprover(id): void {
    console.log('Remove approver:', id);
    let i = 0;
    let j = 0;
    this.approverList.forEach(d => {
      if (d.id === id) {
        j = i;
      }
      i++;
    });

    this.approverList.splice(j, 1);
  }

  dropped(event: CdkDragDrop<any[]>): void {
    moveItemInArray(this.approverList, event.previousIndex, event.currentIndex);
  }
}
