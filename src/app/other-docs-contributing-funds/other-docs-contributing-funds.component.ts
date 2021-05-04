import {Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-other-docs-contributing-funds',
  templateUrl: './other-docs-contributing-funds.component.html',
  styleUrls: ['./other-docs-contributing-funds.component.css']
})
export class OtherDocsContributingFundsComponent implements OnInit {

  constructor(private requestModel: RequestModel) {
  }

  ngOnInit(): void {
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }
}
