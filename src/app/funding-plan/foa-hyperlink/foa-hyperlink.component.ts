import { Component, Input, OnInit } from '@angular/core';
import { CancerActivityControllerService } from '@cbiit/i2erefws-lib'
import { FsLookupControllerService } from '@cbiit/i2efsws-lib';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-foa-hyperlink',
  templateUrl: './foa-hyperlink.component.html',
  styleUrls: ['./foa-hyperlink.component.css']
})
export class FoaHyperlinkComponent implements OnInit {
  @Input() foaNumber: string;
  nihGuideAddr: string;

  constructor(private rfaService: CancerActivityControllerService,
              private lookupService: FsLookupControllerService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    if (!!this.foaNumber) {
      this.rfaService.getRfaPaNoticeByNoticeNumber(this.foaNumber).subscribe(result => {
        if (result?.nihGuideAddr) {
          this.nihGuideAddr = result.nihGuideAddr;
        } else {
          this.lookupService.getNihGuideAddr(this.foaNumber).subscribe(res => {
            if (res && res.nihGuideAddr) {
              this.nihGuideAddr = res.nihGuideAddr;
            } else {
              this.nihGuideAddr = '#';
            }
          }, error => {
            this.logger.error(JSON.stringify(error));
            this.nihGuideAddr = '#';
          });
        }
      });
    }

  }

}
