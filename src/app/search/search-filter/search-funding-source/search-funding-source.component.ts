import { Component, Input, OnInit } from '@angular/core';
import { ControlContainer, NgForm } from "@angular/forms";
import { Select2OptionData } from "ng-select2";
import { Options } from "select2";
import { NGXLogger } from "ngx-logger";
import { FsLookupControllerService } from "@cbiit/i2ecws-lib";
import { FundingRequestFundsSrcDto } from "@cbiit/i2ecws-lib/model/fundingRequestFundsSrcDto";
import { openNewWindow } from "../../../utils/utils";
import { Router } from "@angular/router";
import { Location } from "@angular/common";

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
  availableFundingSources: FundingRequestFundsSrcDto[] = [];

  constructor(private logger: NGXLogger,
              private router: Router,
              private _location: Location,
              private fsLookupControllerService: FsLookupControllerService) {
  }

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
        this.availableFundingSources = (result) ? result : [];
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });
  }

  openFsDetails(): boolean {
    // temporarily using # for the hashtrue file not found issue..
    const url = this._location.prepareExternalUrl(this.router.serializeUrl(this.router.createUrlTree(['fundingSourceDetails'])));
    this.logger.debug(this.router.createUrlTree(['fundingSourceDetails']).toString(), url);
    // storaing the funding sources details for popup window.. removing the object in the component once retrieved
    localStorage.setItem('fundingSources', JSON.stringify(this.availableFundingSources));
    openNewWindow(url, 'fundingSourceDetails');
    return false;
  }
}
