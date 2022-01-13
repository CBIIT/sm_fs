import { Component, OnInit } from '@angular/core';
import {  FundingRequestFundsSrcDto } from '@cbiit/i2ecws-lib';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-funding-sources-names',
  templateUrl: './funding-sources-names.component.html',
  styleUrls: ['./funding-sources-names.component.css']
})
export class FundingSourcesNamesComponent implements OnInit {

  constructor(  private logger: NGXLogger) {  }

  public fundingSources: Array<FundingRequestFundsSrcDto> = [];
  
  
  ngOnInit()	: void {
    this.fundingSources = JSON.parse(localStorage.getItem('fundingSources'));
    localStorage.removeItem('fundingSources');
  }
}
