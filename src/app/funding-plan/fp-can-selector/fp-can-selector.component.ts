import { Component, Input, OnInit } from '@angular/core';
import { CanCcxDto } from '@cbiit/i2ecws-lib';
import { CanManagementService } from '../../cans/can-management.service';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';

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
    this.logger.info(`CAN Selection init: applId = ${this.applId} -- fseId = ${this.fseId}`);
    this.canManagementService.projectedCanEmitter.subscribe(next => {
      this.logger.info(`Projected CAN: ${next.fseId}, ${next.applId} == ${next.can?.can}`);
      this.logger.info(`My applId = ${this.applId} -- fseId = ${this.fseId}`);
      if (+next.fseId === +this.fseId && +next.applId === +this.applId) {
        this.projectedCAN = next.can;
        // this.logger.debug(this.fseId, this.applId, this.projectedCAN);
      }
    });
    this.canManagementService.selectCANEmitter.subscribe(next => {
      if ((!next.applId || (Number(this.applId) === Number(next.applId))) && Number(next.fseId) === Number(this.fseId)) {
        // this.logger.debug(`Should I select this CAN? ${this.fseId} -- ${JSON.stringify(next)}`);
        if (next.override || (!next.override && (next.can.can && this.projectedCAN?.can))) {
          this.logger.info(`in selectCANEmitter handler: ${next.applId}, ${next.fseId}, ${next.override}, ${next.can?.can}`);
          this.selectedCAN = next.override ? next.can : this.projectedCAN;
          this.planModel.saveSelectedCAN(this.fseId, this.applId, this.selectedCAN);
          this.canManagementService.checkDefaultCANs(
            this.fseId,
            this.applId,
            this.planModel.activityCodeList,
            this.planModel.bmmCodeList,
            this.nciSourceFlag,
            this.selectedCAN?.can);
        }
      }
    });
  }
}
