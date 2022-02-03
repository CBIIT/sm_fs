import { Component, Input, OnInit } from '@angular/core';
import { CanCcxDto } from '@cbiit/i2ecws-lib';
import { CanManagementService } from '../../cans/can-management.service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-fp-projected-can',
  templateUrl: './fp-projected-can.component.html',
  styleUrls: ['./fp-projected-can.component.css']
})
export class FpProjectedCanComponent implements OnInit {
  @Input() index = 0;

  @Input() fseId: number;
  @Input() octId: number = null;
  @Input() frtId: number;
  @Input() applId: number;
  @Input() frqId: number;

  projectedCan: CanCcxDto;


  constructor(
    private canManagementService: CanManagementService,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.canManagementService.oefiaTypeEmitter.subscribe(next => {
      // this.logger.debug(next, this.fseId, this.octId, this.frtId, this.applId);
      if (Number(next.fseId) === Number(this.fseId)) {
        this.updateProjectedCan(next.value);
      }
    });
    const val = !isNaN(this.octId) ? this.octId : null;
    this.updateProjectedCan(val);
  }

  private updateProjectedCan(oefiaTypeId: number): void {
    this.canManagementService.getProjectedCan(this.fseId, oefiaTypeId, this.frtId, null, this.applId).subscribe(result => {
      this.projectedCan = result;
      // this.logger.debug('new projected CAN for', this.fseId, this.applId, result);
      this.canManagementService.projectedCanEmitter.next({ index: this.index, can: result, fseId: this.fseId, applId: this.applId });
    });
  }
}
