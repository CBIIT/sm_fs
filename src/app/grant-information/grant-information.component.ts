import {Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../service/app-properties.service';

@Component({
  selector: 'app-grant-information',
  templateUrl: './grant-information.component.html',
  styleUrls: ['./grant-information.component.css']
})
export class GrantInformationComponent implements OnInit {

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

}
