import {Component, Input, OnInit} from '@angular/core';
import {RequestModel} from "../../../model/request/request-model";
import {Router} from "@angular/router";
import {AppUserSessionService} from "../../../service/app-user-session.service";
import {GrantsSearchFilterService} from "../../grants-search/grants-search-filter.service";
import {NciPfrGrantQueryDto} from "@cbiit/i2ecws-lib";

@Component({
  selector: 'app-funding-request-action-cell-renderer',
  templateUrl: './funding-request-action-cell-renderer.component.html',
  styleUrls: ['./funding-request-action-cell-renderer.component.css']
})
export class FundingRequestActionCellRendererComponent implements OnInit {

  constructor(private router: Router,
              private grantsSearchFilterService: GrantsSearchFilterService,
              private userSessionService: AppUserSessionService,
              private requestModel: RequestModel) { }

  ngOnInit(): void {
  }

  @Input()
  data : any = {}

  disabledTooltip(grant: NciPfrGrantQueryDto): string {
    if (grant.applTypeCode === '3') {
      return 'Select the parent grant to request supplements';
    }
    else {
      return 'Grant Application is in the ' + grant.applStatusGroupDescrip +
        ' IMPAC II status and cannot be selected for requesting funds.';
    }
  }

  actionDisabled(grant: NciPfrGrantQueryDto): boolean {
    const disabledStatuses: string[] = ['W', 'T', 'C', 'U', 'N', 'RR'];
    if (grant.applTypeCode === '3' || disabledStatuses.indexOf(grant.applStatusGroupCode) !== -1) {
      return true;
    }
    else {
      return false;
    }
  }

  nextStep(event, grant): void {
    // NOTE: reset() isn't necessary since we will always be starting from scratch here.  User can't go back from step2 to step1.
    this.requestModel.reset();
    this.requestModel.requestDto.userLdapId = this.userSessionService.getLoggedOnUser().nihNetworkId;
    this.requestModel.requestDto.pdNpnId = this.userSessionService.getLoggedOnUser().npnId;
    this.requestModel.grant = grant;
    this.requestModel.requestDto.fy = this.grantsSearchFilterService.currentFy;
    this.requestModel.requestDto.requestFy = this.grantsSearchFilterService.currentFy;
    this.requestModel.requestDto.financialInfoDto.fy = this.requestModel.requestDto.fy;
    this.router.navigate(['/request/step2']);
  }
}
