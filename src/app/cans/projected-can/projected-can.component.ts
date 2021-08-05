import { Component, Input, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { CanManagementService } from '../can-management.service';
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

  constructor(private logger: NGXLogger, private canService: CanManagementService) {
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
    const source = Number(this.fseId);
    this.logger.debug('updateProjectedCan', this.index, this.fseId, oefiaType);
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
