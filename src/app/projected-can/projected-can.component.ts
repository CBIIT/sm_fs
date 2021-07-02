import {Component, Input, OnInit} from '@angular/core';
import {NGXLogger} from "ngx-logger";
import {CanManagementService} from "../service/can-management-service";
import {CanCcxDto} from "@nci-cbiit/i2ecws-lib";

@Component({
  selector: 'app-projected-can',
  templateUrl: './projected-can.component.html',
  styleUrls: ['./projected-can.component.css']
})
export class ProjectedCanComponent implements OnInit {
  @Input() fundingSourceId: number;
  @Input() oefiaTypeId: number;
  projectedCan: CanCcxDto;

  constructor(private logger: NGXLogger, private canService: CanManagementService) {
  }

  ngOnInit(): void {
    if(!isNaN(this.fundingSourceId) && !isNaN(this.oefiaTypeId)) {
      this.canService.getProjectedCan(this.fundingSourceId, this.oefiaTypeId).subscribe(result => {
        this.projectedCan = result;
      }, error => {
        this.logger.error(error);
      });
    }
  }

}
