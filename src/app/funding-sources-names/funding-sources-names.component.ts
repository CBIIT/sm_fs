import { Component, OnInit } from '@angular/core';
import {FsLookupControllerService} from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-funding-sources-names',
  templateUrl: './funding-sources-names.component.html',
  styleUrls: ['./funding-sources-names.component.css']
})
export class FundingSourcesNamesComponent implements OnInit {

  constructor(private fslookupControllerService: FsLookupControllerService) { }
 public fundingSourceNames: any;
  ngOnInit(): void {

    this.fslookupControllerService.getFundingSourcesNameDetailsUsingGET().subscribe(
      result => {
        console.log('Getting the Doc Dropdown results');
        // result.push({id: '', abbreviation: '', description: ''});
        this.fundingSourceNames = result;
      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });

  }

}
