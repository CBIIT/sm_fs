import {Component, Input, OnInit} from '@angular/core';
import {NGXLogger} from 'ngx-logger';
import {CanManagementServiceBus} from '../can-management-service-bus.service';
import {CanCcxDto} from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-projected-can',
  templateUrl: './projected-can.component.html',
  styleUrls: ['./projected-can.component.css']
})
export class ProjectedCanComponent implements OnInit {

  @Input() index = 0;

  @Input() fseId: number;

  projectedCan: CanCcxDto;

  constructor(private logger: NGXLogger, private canService: CanManagementServiceBus) {
  }

  ngOnInit(): void {
    this.canService.oefiaTypeEmitter.subscribe(next => {
      if (Number(this.index) === Number(next.index)) {
        this.updateProjectedCan(next.value);
      }
    });
  }

  updateProjectedCan(oefiaType: number): void {
    const source = Number(this.fseId);

    this.canService.getProjectedCan(source, oefiaType).subscribe(result => {
      this.logger.debug('getting new projected CAN for', source, oefiaType);
      this.logger.debug(JSON.stringify(result));
      this.projectedCan = result;
      this.canService.projectedCanEmitter.next({index: this.index, can: result});
    });
  }
}
