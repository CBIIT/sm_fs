import { Component, OnInit } from '@angular/core';
import { Options } from 'select2';
import { RequestModel } from '../model/request/request-model';
import { NGXLogger } from 'ngx-logger';
import { ControlContainer, NgForm } from '@angular/forms';
import { FsLookupControllerService, FsRequestControllerService, FundingRequestSkipDto, NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';
import { Router } from '@angular/router';
import { openNewWindow } from '../utils/utils';

@Component({
  selector: 'app-skipped-grants',
  templateUrl: './skipped-grants.component.html',
  styleUrls: ['./skipped-grants.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class SkippedGrantsComponent implements OnInit {
  get selectedValue(): string {
    return this._selectedValue;
  }



  _selectedValue: string;
  options: Options;
  skipGrants: Array<string> = new Array<string>();
  skipGrantsDto: Array<FundingRequestSkipDto> = new Array<FundingRequestSkipDto>();
  grants: Array<string>;
  tooltipGrant: any;
  private _grant: NciPfrGrantQueryDto;


  constructor(private requestModel: RequestModel,
    private logger: NGXLogger,
    private fsLookupControllerService: FsLookupControllerService,
    private requestService: FsRequestControllerService,
    private router: Router) {
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
          this.payload = data;
          return {
            results: $.map(data, sg => {
              return {
                id: sg.skipFullGrantNum,
                text: sg.skipFullGrantNum,
                payload: sg
              };
            })
          };
        }
      }
    };
  }

  set selectedValue(value: string) {
    this._selectedValue = value;
    if (value) {
      this.skipGrants.push(value);
      this.fsLookupControllerService.getFundingRequestSkipGrantsUsingGET(value).subscribe(
        result => {
          for (let dto in result) {
            this.skipGrantsDto.push(result[dto]);
            this.requestService.retrieveSkipFundingRequestUsingGET(result[dto].skipApplId).subscribe(
              (result) => {
                this._grant = result;
              }, (error) => {
                this.logger.error('retrieveFundingRequest failed ', error);
              });
          }
        }, error => {
          this.logger.error('HttpClient get request error for----- ' + error.message);
        });
    }
    this.grants = [];
  }

  deleteSkipGrant(g: FundingRequestSkipDto): void {
    const i = this.skipGrantsDto.indexOf(g);
    this.skipGrantsDto.splice(i, 1);
  }

  get grant(): NciPfrGrantQueryDto {
    return this._grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  setGrant(grant): void {
    this.tooltipGrant = grant;
  }

  openSkipRequest(skipFrqId: number) {
    openNewWindow('#/request/retrieve/' + skipFrqId, 'SKIP-REQUEST');
  }
}
