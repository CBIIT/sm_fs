import { Component, Input, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { CanManagementService } from '../can-management.service';
import { CanCcxDto } from '@nci-cbiit/i2ecws-lib';
import { RequestModel } from '../../model/request/request-model';

@Component({
  selector: 'app-projected-can',
  templateUrl: './projected-can.component.html',
  styleUrls: ['./projected-can.component.css']
})
export class ProjectedCanComponent implements OnInit {

  @Input() index = 0;

  @Input() fseId: number;
  @Input() octId: number = null;
  @Input() frtId: number;
  @Input() applId: number;

  projectedCan: CanCcxDto;

  constructor(private logger: NGXLogger, private canService: CanManagementService, private requestModel: RequestModel) {
  }

  ngOnInit(): void {
    this.canService.oefiaTypeEmitter.subscribe(next => {
      if (next.fseId && Number(next.fseId) === Number(this.fseId)) {
        this.updateProjectedCan(next.value);
      } else if (Number(this.index) === Number(next.index)) {
        this.updateProjectedCan(next.value);
      }
    });
    if (!this.frtId) {
      this.frtId = this.requestModel.requestDto.frtId;
    }
    if (this.octId) {
      this.updateProjectedCan(this.octId);
    } else {
      this.updateProjectedCan(null);
    }
  }

  updateProjectedCan(oefiaType: number): void {
    const source = Number(this.fseId);

    this.canService.getProjectedCan(source, oefiaType, this.frtId, this.applId).subscribe(result => {
      this.projectedCan = result;
      this.canService.projectedCanEmitter.next({ index: this.index, can: result });
    });
  }
}
