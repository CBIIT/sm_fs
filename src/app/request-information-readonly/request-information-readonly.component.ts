import { Component, OnInit } from '@angular/core';
import {RequestModel} from '../model/request-model';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-request-information-readonly',
  templateUrl: './request-information-readonly.component.html',
  styleUrls: ['./request-information-readonly.component.css']
})
export class RequestInformationReadonlyComponent implements OnInit {

  constructor(private requestModel: RequestModel) { }

  ngOnInit(): void {
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

}
