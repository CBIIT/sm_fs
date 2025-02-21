import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { CanManagementService } from '../can-management.service';
import { OefiaCodingDto } from '@cbiit/i2efsws-lib';
import { Select2OptionData } from 'ng-select2';
import { FundingRequestFundsSrcDto } from '@cbiit/i2efsws-lib/model/fundingRequestFundsSrcDto';
import { RequestModel } from '../../model/request/request-model';

@Component({
  selector: 'app-oefia-types',
  templateUrl: './oefia-types.component.html',
  styleUrls: ['./oefia-types.component.css']
})
export class OefiaTypesComponent implements OnInit, AfterViewInit {
  @Input() index = 0;
  @Input() ids;
  @Input() fseId: number;
  oefiaCodes: OefiaCodingDto[];
  selectedOefiaType: { id: string; text: string };
  private _selectedValue: number;
  @Input() readonly = false;

  @Input()
  get selectedValue(): number {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<number>();
  data: Select2OptionData[];

  set selectedValue(value: number) {
    this._selectedValue = value;
    if (value && this.data) {
      this.data.forEach(d => {
        if (d.id === String(value)) {
          this.selectedOefiaType = d;
        }
      });
    } else {
      this.selectedOefiaType = null;
    }
    this.selectedValueChange.emit(value);
    this.canService.oefiaTypeEmitter.next({ index: this.index, value, fseId: this.fseId });
  }

  constructor(
    private logger: NGXLogger,
    private canService: CanManagementService,
    private requestModel: RequestModel) {
  }

  ngOnInit(): void {
    this.logger.debug(`Initial values: [fseId: ${this.fseId}, selectedValue: ${this._selectedValue}]`);
    if(!this._selectedValue) {
      const source: FundingRequestFundsSrcDto = this.requestModel.programRecommendedCostsModel.fundingSources.find(s => +s.fundingSourceId === +this.fseId);
      this.logger.debug(`No oefiaTypeId specified: fall back to funding source default ${source?.octId}`);
      this._selectedValue = source?.octId;
    }
    this.canService.getOefiaCodes().subscribe(result => {
      this.logger.debug(`OEFIA Codes: ${JSON.stringify(result)}`);
      this.oefiaCodes = result;
      this.data = [];
      this.data.push({ id: '', text: '' });
      result.forEach(c => {
        this.data.push({ id: String(c.id), text: c.category });
        if(Number(c.id) === Number(this.selectedValue)) {
          this.selectedOefiaType = {id: String(c.id), text: c.category};
        }
      });
    });
  }

  ngAfterViewInit(): void {
  }
}
