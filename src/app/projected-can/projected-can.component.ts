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
  _oefiaType: number;

  @Input()
  get oefiaType(): number {
    return this._oefiaType;
  }

  set oefiaType(value: number) {
    this._oefiaType = value;
    this.updateProjectedCan();
  }

  @Input() fseId: number;

  @Input() projectedCan: CanCcxDto;

  constructor(private logger: NGXLogger, private canService: CanManagementService) {
  }

  ngOnInit(): void {
  }

  updateProjectedCan(): void {
    const source = Number(this.fseId);

    this.canService.getProjectedCan(source, this.oefiaType).subscribe(result => {
      this.logger.debug('getting new projected CAN for', source, this.oefiaType);
      this.projectedCan = result;
    });
  }
}
