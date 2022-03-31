import { Component, Input, OnInit } from '@angular/core';
import { FundingReqApproversDto, NciPfrGrantQueryDto } from '@cbiit/i2ecws-lib';
import { RequestModel } from 'src/app/model/request/request-model';

// this is to work around the name returned by stored procedure contains text listed in suffixchecks.
@Component({
  selector: 'app-approver-name-renderer',
  templateUrl: './approver-name-renderer.component.html',
  styleUrls: ['./approver-name-renderer.component.css']
})
export class ApproverNameRendererComponent implements OnInit {
  @Input() approver: FundingReqApproversDto;

  grant: NciPfrGrantQueryDto;
  name: string;
  suffix: string;
  private suffixChecks = [' on behalf of NCI Director',
                  ' (Designee for NCI Director)',
                  ', Executive Secretary'];

  constructor(private requestModel: RequestModel) { }

  ngOnInit(): void {
    this.grant = this.requestModel.grant;
    this.name = this.approver.approverFullName;
    if (this.name) {
      for (const suffix of this.suffixChecks) {
        if (this.name.includes(suffix)) {
          this.name = this.name.substr(0, this.name.length - suffix.length);
          this.suffix = suffix;
          break;
        }
      }
    }
  }

}
