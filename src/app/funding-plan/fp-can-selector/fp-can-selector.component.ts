import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CanCcxDto } from '@nci-cbiit/i2ecws-lib';
import { CanManagementService } from '../../cans/can-management.service';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';
import { PlanManagementService } from '../service/plan-management.service';

@Component({
  selector: 'app-fp-can-selector',
  templateUrl: './fp-can-selector.component.html',
  styleUrls: ['./fp-can-selector.component.css']
})
export class FpCanSelectorComponent implements OnInit {
  @Input() applId: number;
  @Input() fseId: number;
  @Input() nciSourceFlag: string;
  @Input() index = 0;
  @Input() readonly = false;
  selectedCAN: CanCcxDto;
  projectedCAN: CanCcxDto;

  constructor(private canManagementService: CanManagementService,
              private planModel: PlanModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.canManagementService.projectedCanEmitter.subscribe(next => {
      if (+next.fseId === +this.fseId && +next.applId === +this.applId) {
        this.projectedCAN = next.can;
        this.logger.debug(this.fseId, this.applId, this.projectedCAN);
      }
    });
    this.canManagementService.selectCANEmitter.subscribe(next => {
      if ((!next.applId || (Number(this.applId) === Number(next.applId))) && Number(next.fseId) === Number(this.fseId)) {
        if (!next.can || next.override || (next.can.can && this.projectedCAN?.can)) {
          this.selectedCAN = next.can;
          this.planModel.saveSelectedCAN(this.fseId, this.applId, next.can);
          this.canManagementService.checkDefaultCANs(
            this.fseId,
            this.applId,
            this.planModel.activityCodeList,
            this.planModel.bmmCodeList,
            this.nciSourceFlag,
            next.can?.can);
        }
      }
    });
  }
}
