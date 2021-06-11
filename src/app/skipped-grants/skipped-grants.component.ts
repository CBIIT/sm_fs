import {Component, OnInit} from '@angular/core';
import {Options} from 'select2';
import {RequestModel} from '../model/request-model';
import {AppUserSessionService} from '../service/app-user-session.service';
import {FsWorkflowControllerService} from '@nci-cbiit/i2ecws-lib';
import {NGXLogger} from 'ngx-logger';

@Component({
  selector: 'app-skipped-grants',
  templateUrl: './skipped-grants.component.html',
  styleUrls: ['./skipped-grants.component.css']
})
export class SkippedGrantsComponent implements OnInit {
  get selectedValue(): string {
    return this._selectedValue;
  }

  set selectedValue(value: string) {
    this._selectedValue = value;
    if (value) {
      this.skipGrants.push(value);
    }
    this.grants = [];
  }

  _selectedValue: string;
  options: Options;
  skipGrants: Array<string> = new Array<string>();
  grants: Array<string>;


  constructor(private requestModel: RequestModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.options = {
      allowClear: true,
      minimumInputLength: 4,
      closeOnSelect: true,
      placeholder: '',
      language: {
        inputTooShort(): string {
          return '';
        }
      },
      ajax: {
        url: '/i2ecws/api/v1/fs/lookup/funding-requests/skip-grants/',
        delay: 500,
        type: 'GET',
        data(params): any {
          return {
            term: params.term
          };
        },
        processResults(data): any {
          return {
            results: $.map(data, sg => {
              return {
                id: sg.fullGrantNum,
                text: sg.fullGrantNum
              };
            })
          };
        }
      }
    };
  }

  deleteSkipGrant(g: string): void {
    const i = this.skipGrants.indexOf(g);
    this.skipGrants.splice(i, 1);
  }
}
