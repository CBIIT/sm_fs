import { Component, Input, OnInit } from '@angular/core';
import { Options } from 'select2';
import { RequestModel } from '../model/request/request-model';
import { NGXLogger } from 'ngx-logger';
import { ControlContainer, NgForm } from '@angular/forms';
import {
  FsLookupControllerService,
  FsRequestControllerService,
  FundingRequestSkipDto,
  NciPfrGrantQueryDto
} from '@cbiit/i2efsws-lib';
import { openNewWindow } from '../utils/utils';

@Component({
  selector: 'app-skipped-grants',
  templateUrl: './skipped-grants.component.html',
  styleUrls: ['./skipped-grants.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }]
})
export class SkippedGrantsComponent implements OnInit {
  dummy: string;
  order = 1;
  @Input() parentForm: NgForm;
  @Input() readOnly = false;

  _selectedValue: string;
  options: Options;
  skipGrants: Array<string> = new Array<string>();
  skipGrantsDto: Array<FundingRequestSkipDto> = new Array<FundingRequestSkipDto>();
  grants: Array<string>;
  tooltipGrant: FundingRequestSkipDto;
  private _grant: NciPfrGrantQueryDto;

  constructor(private requestModel: RequestModel,
              private logger: NGXLogger,
              private fsLookupControllerService: FsLookupControllerService,
              private requestService: FsRequestControllerService) {
  }

  ngOnInit(): void {
    this.skipGrantsDto = this.requestModel.requestDto.skipRequests || new Array<FundingRequestSkipDto>();
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
        url: '/i2efsws/api/v1/fs/lookup/funding-requests/skip-grants/',
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

  get selectedValue(): string {
    return this._selectedValue;
  }

  sortGrants(): void {
    // this.logger.debug(`sortGrants: ${this.order}`);
    this.skipGrantsDto.sort((a, b) => {
      let result = 0;

      if (a.skipFullGrantNum === b.skipFullGrantNum) {
        result = 0;
      } else if (a.skipFullGrantNum < b.skipFullGrantNum) {
        result = -1;
      } else {
        result = 1;
      }
      return result * this.order;
    });
    this.order = this.order * -1;
  }


  set selectedValue(value: string) {
    // this.logger.debug(`selected value ${value}`);
    this._selectedValue = value;
    if (value) {
      this.skipGrants.push(value);
      this.fsLookupControllerService.getFundingRequestSkipGrants(value).subscribe(
        result => {
          this.logger.debug('result:', result);
          for (const dto in result) {
            this.skipGrantsDto.push(result[dto]);
            this.requestModel.requestDto.skipRequests = this.skipGrantsDto;
            // this.requestService.retrieveSkipFundingRequest(result[dto].skipApplId).subscribe(
            //   (r) => {
            //     this._grant = r;
            //   }, (error) => {
            //     this.logger.error('retrieveFundingRequest failed ', error);
            //   });
          }
        }, error => {
          this.logger.error('HttpClient get request error for----- ' + error.message);
        });
    }
    this.grants = [];
  }

  deleteSkipGrant($event, g: FundingRequestSkipDto): void {
    this.logger.debug(typeof $event);
    $event.preventDefault();
    if (confirm('Are you sure you want to remove the "Skipped Application"?')) {
      const i = this.skipGrantsDto.indexOf(g);
      this.skipGrantsDto.splice(i, 1);
      this.requestModel.requestDto.skipRequests = this.skipGrantsDto;
    }
  }

  get grant(): NciPfrGrantQueryDto {
    return this._grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  setGrant(grant: FundingRequestSkipDto): void {
    this.logger.debug('setGrant', grant);
    this.tooltipGrant = grant;
  }

  openSkipRequest(skipFrqId: number): void {
    openNewWindow('#/request/retrieve/' + skipFrqId, 'SKIP-REQUEST');
  }
}
