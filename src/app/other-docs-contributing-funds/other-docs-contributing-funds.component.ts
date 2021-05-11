import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {LookupsControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {Select2OptionData} from 'ng-select2';
import {Options} from 'select2';

@Component({
  selector: 'app-other-docs-contributing-funds',
  templateUrl: './other-docs-contributing-funds.component.html',
  styleUrls: ['./other-docs-contributing-funds.component.css']
})
export class OtherDocsContributingFundsComponent implements OnInit {


  @Input() maxSelection = 1;
  @Input() label = 'Division/Office/Center (DOC)';

  @Input()
  get selectedValue(): number[] {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<number[]>();

  set selectedValue(value: number[]) {
    console.log('DOC selectedValue setter called ', value);
    this._selectedValue = value;
    this.selectedValueChange.emit(value);
  }

  private _selectedValue: number [] = [];

  // NOTE: if the following array is typed as Select2OptionData, compilation fails
  public docs: Array<any>;
  public options: Options;

  constructor(private lookupsControllerService: LookupsControllerService, private requestModel: RequestModel) {
  }

  ngOnInit(): void {
    this.options = {};
    const multi = (Number(this.maxSelection) !== Number(1));
    console.log('Multiple select:', multi);
    if (multi) {
      this.options.multiple = true;
    }
    if (multi && this.maxSelection !== -1) {
      this.options.maximumSelectionLength = this.maxSelection;
    }
    this.lookupsControllerService.getNciDocsUsingGET().subscribe(
      result => {
        console.log('Getting the Doc Dropdown results');
        // result.push({id: '', abbreviation: '', description: ''});
        this.docs = result;
      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });

  }

}
