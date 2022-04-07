import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { ControlContainer, NgForm, NgModel } from '@angular/forms';
import { Select2OptionData } from 'ng-select2';
import { Options } from 'select2';
import { NGXLogger } from 'ngx-logger';
import { FsLookupControllerService } from '@cbiit/i2ecws-lib';

@Component({
  selector: 'app-search-funding-request-doc',
  templateUrl: './search-funding-request-doc.component.html',
  styleUrls: ['./search-funding-request-doc.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class SearchFundingRequestDocComponent implements OnInit {

  @Input() required = false;
  @Input() form: NgForm; // optional parent form to validate on submit
  @Input() label = 'Doc';
  @Input() name = 'funding-request-doc-select'; // optional control name (default is 'funding-request-doc-select')

  @ViewChild('fundingRequestDoc') frTypeControl: NgModel;

  data: Array<Select2OptionData> = [];
  options: Options = {};

  constructor(private logger: NGXLogger,
              private fsLookupControllerService: FsLookupControllerService) {
  }

  ngOnInit(): void {
    this.fsLookupControllerService.getRequestDocs().subscribe(
      result => {
        const dropdownList: Array<Select2OptionData> = [];
        for (const entry of result) {
          dropdownList.push({
            id: entry.abbr, text: entry.abbr + ' - ' + entry.description
          });
        }
        this.data = dropdownList;
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
  }
}
