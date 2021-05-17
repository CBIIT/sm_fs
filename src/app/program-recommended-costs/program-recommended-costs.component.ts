import {Component, OnInit} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {AppPropertiesService} from '../service/app-properties.service';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {openNewWindow} from 'src/app/utils/utils';
import {Router} from '@angular/router';


@Component({
  selector: 'app-program-recommended-costs',
  templateUrl: './program-recommended-costs.component.html',
  styleUrls: ['./program-recommended-costs.component.css']
})
export class ProgramRecommendedCostsComponent implements OnInit {

  grantViewerUrl: string = this.propertiesService.getProperty('GRANT_VIEWER_URL');


  constructor(private requestModel: RequestModel, private propertiesService: AppPropertiesService , private router: Router) {
  }

  ngOnInit(): void {
  }

  get grant(): NciPfrGrantQueryDto {
    return this.requestModel.grant;
  }

  get model(): RequestModel {
    return this.requestModel;
  }

  openOefiaLink(){
    openNewWindow('https://mynci.cancer.gov/topics/oefia-current-fiscal-year-funding-information','oefiaLink');
    return false;
  }

  // open the funding source help in the new window..
  openFsDetails(){
    //const url = this.router.serializeUrl(
      //this.router.createUrlTree([`/fundingSourceDetails`])
    //);
    const url = "/fs"+this.router.createUrlTree(['fundingSourceDetails']).toString();
    openNewWindow(url,'fundingSourceDetails');
    return false;
  }
}
