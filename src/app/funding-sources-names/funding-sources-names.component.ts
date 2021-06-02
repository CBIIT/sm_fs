import { Component, OnInit } from '@angular/core';
import { FsLookupControllerService } from '@nci-cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-funding-sources-names',
  templateUrl: './funding-sources-names.component.html',
  styleUrls: ['./funding-sources-names.component.css']
})
export class FundingSourcesNamesComponent implements OnInit {

  constructor(private fslookupControllerService: FsLookupControllerService, private logger: NGXLogger) { }
  public fundingSourceNames: any;
  ngOnInit(): void {

    this.fslookupControllerService.getFundingSourcesNameDetailsUsingGET().subscribe(
      result => {
        this.fundingSourceNames = result;
        this.logger.debug('Funding source help results: ', result);
      }, error => {
        this.logger.error('HttpClient get request error for----- ' + error.message);
      });

  }

}
