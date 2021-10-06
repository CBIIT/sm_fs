import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {ControlContainer, NgForm, NgModel} from "@angular/forms";
import {Select2OptionData} from "ng-select2";
import {Options} from "select2";
import {NGXLogger} from "ngx-logger";
import {FsLookupControllerService} from "@nci-cbiit/i2ecws-lib";
import {openNewWindow} from "../../../utils/utils";

@Component({
  selector: 'app-search-funding-request-doc',
  templateUrl: './search-funding-request-doc.component.html',
  styleUrls: ['./search-funding-request-doc.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class SearchFundingRequestDocComponent implements OnInit {

  @Input() required: boolean = false;
  @Input() form: NgForm; // optional parent form to validate on submit
  @Input() label: string = 'Doc';
  @Input() name: string = 'funding-request-doc-select'; // optional control name (default is 'funding-request-doc-select')

  @ViewChild('fundingRequestDoc') frTypeControl: NgModel

  data: Array<Select2OptionData> = [];
  options: Options = {};

  constructor(private logger: NGXLogger,
              private fsLookupControllerService: FsLookupControllerService) { }

  ngAfterViewInit(): void {
  }

  ngOnInit(): void {
    this.fsLookupControllerService.getRequestDocsUsingGET().subscribe(
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
        alert('HttpClient get request error for----- ' + error.message); //TODO error handling
      });
  }
}
