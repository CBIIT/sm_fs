import {Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {AppPropertiesService} from '../service/app-properties.service';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-request-information',
  templateUrl: './request-information.component.html',
  styleUrls: ['./request-information.component.css']
})
export class RequestInformationComponent implements OnInit {

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');

  constructor(private requestModel: RequestModel, private propertiesService: AppPropertiesService) {
  }

  ngOnInit(): void {
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  receiveCasValue(e): void {

  }

  receivePdIdValue(e): void {

  }

}
