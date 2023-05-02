import { Component, OnInit } from '@angular/core';
import { RequestModel } from '../model/request/request-model';
import { NciPfrGrantQueryDto } from '@cbiit/i2ecws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { convertNcabs } from 'src/app/utils/utils';

@Component({
  selector: 'app-grant-information',
  templateUrl: './grant-information.component.html',
  styleUrls: ['./grant-information.component.css']
})
export class GrantInformationComponent implements OnInit {

  tooltipGrant: any;

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
  
  setGrant(grant): void {
    this.tooltipGrant = grant;
  }
  
  convert(ncabs: string ): string {
    return convertNcabs(ncabs);
  }
}
