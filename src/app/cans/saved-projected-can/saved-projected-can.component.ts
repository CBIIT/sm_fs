import { Component, Input, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { CanManagementService } from '../can-management.service';
import { CanCcxDto } from '@cbiit/i2efsws-lib';

@Component({
  selector: 'app-saved-projected-can',
  templateUrl: './saved-projected-can.component.html',
  styleUrls: ['./saved-projected-can.component.css']
})
export class SavedProjectedCanComponent implements OnInit {
  @Input() savedCan = null;

  projectedCan: CanCcxDto;

  constructor(
    private logger: NGXLogger,
    private canService: CanManagementService) {
  }

  ngOnInit(): void {
    if (this.savedCan) {
      this.canService.getCanDetails(this.savedCan).subscribe(result => {
        this.projectedCan = result;
        this.logger.debug('saved projected CAN details', result);
      }); 
    }
  }
}
