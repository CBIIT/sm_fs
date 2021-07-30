import { Component, Input, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { CanManagementServiceBus } from '../can-management-service-bus.service';
import { CanCcxDto } from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-projected-can',
  templateUrl: './projected-can.component.html',
  styleUrls: ['./projected-can.component.css']
})
export class ProjectedCanComponent implements OnInit {

  @Input() index = 0;

  @Input() fseId: number;
  @Input() octId: number = null;

  projectedCan: CanCcxDto;

  constructor(private logger: NGXLogger, private canService: CanManagementServiceBus) {
  }

  ngOnInit(): void {
    this.canService.oefiaTypeEmitter.subscribe(next => {
      if (Number(this.index) === Number(next.index)) {
        this.updateProjectedCan(next.value);
      }
    });
    if (this.octId) {
      this.updateProjectedCan(this.octId);
    }
  }

  updateProjectedCan(oefiaType: number): void {
    this.logger.debug('updateProjectedCan', oefiaType);
    const source = Number(this.fseId);
    if (!oefiaType) {
      return;
    }

    this.canService.getProjectedCan(source, oefiaType).subscribe(result => {
      this.projectedCan = result;
      this.logger.debug(result);
      this.canService.projectedCanEmitter.next({ index: this.index, can: result });
    });
  }
}
