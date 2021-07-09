import { Component, OnInit } from '@angular/core';
import { RequestModel } from '../model/request-model';
import { NciPfrGrantQueryDto } from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-request-information-readonly',
  templateUrl: './request-information-readonly.component.html',
  styleUrls: ['./request-information-readonly.component.css']
})

export class RequestInformationReadonlyComponent implements OnInit {

  loaMap: any;
  constructor(private requestModel: RequestModel) { }

  ngOnInit(): void {
    this.loaMap = new Map<string, string>()
    .set("PD", "PD")
    .set("DD", "NCI Director")
    .set("SPL", "Scientific Program Leaders Committee")
    .set("DAO", "Division/Office/Center Approver");
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

}
