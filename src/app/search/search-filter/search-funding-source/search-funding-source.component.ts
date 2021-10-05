import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {ControlContainer, NgForm, NgModel} from "@angular/forms";
import {Select2OptionData} from "ng-select2";
import {Options} from "select2";
import {NGXLogger} from "ngx-logger";
import {FsLookupControllerService} from "@nci-cbiit/i2ecws-lib";

@Component({
  selector: 'app-search-funding-source',
  templateUrl: './search-funding-source.component.html',
  styleUrls: ['./search-funding-source.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class SearchFundingSourceComponent implements OnInit {


  @Input() required: boolean;
  @Input() form: NgForm; // optional parent form to validate on submit
  @Input() name: string; // optional control name (default is 'funding-request-doc-select')

  data: Array<Select2OptionData> = [];
  options: Options = {};

  constructor(private logger: NGXLogger,
              private fsLookupControllerService: FsLookupControllerService) { }

  ngAfterViewInit(): void {
  }

  ngOnInit(): void {
    this.fsLookupControllerService.getFundingSourcesNameDetailsUsingGET().subscribe(
      result => {
        const dropdownList: Array<Select2OptionData> = [];
        for (const entry of result) {
          dropdownList.push({
            id: String(entry.fundingSourceId), text: entry.fundingSourceName
          });
        }
        this.data = dropdownList;
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
        alert('HttpClient get request error for----- ' + error.message); //TODO error handling
      });
  }
}
