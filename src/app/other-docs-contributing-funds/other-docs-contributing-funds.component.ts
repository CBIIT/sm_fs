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
  @Input() label = 'Division/Office/Center (DOC)';

  @Input()
  get selectedValue(): string {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<string>();

  set selectedValue(value: string) {
    console.log('DOC selectedValue setter called ', value);
    this._selectedValue = value;
    this.selectedValueChange.emit(value);
  }

  private _selectedValue: string;

  // NOTE: if the following array is typed as Select2OptionData, compilation fails
  // Select2OptionData requires id and text attributes. If the supplied data doesn't
  // have those values, you should modify the data appropriately.
  public docs: Array<any>;
  public options: Options;

  constructor(private lookupsControllerService: LookupsControllerService, private requestModel: RequestModel) {
  }

  ngOnInit(): void {
    this.options = {};

    this.lookupsControllerService.getNciDocsUsingGET().subscribe(
      result => {
        console.log('Getting the Doc Dropdown results');
        // result.push({id: '', abbreviation: '', description: ''});
        result.forEach(r => {
          // console.log({id: r.abbreviation, text: r.abbreviation + ' - ' + r.description});
        });
        this.docs = result;
      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });

  }

}
