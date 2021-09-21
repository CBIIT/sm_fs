import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CanCcxDto } from '@nci-cbiit/i2ecws-lib';
import { CanManagementService } from '../../cans/can-management.service';
import { NGXLogger } from 'ngx-logger';

@Component({
  selector: 'app-fp-can-selector',
  templateUrl: './fp-can-selector.component.html',
  styleUrls: ['./fp-can-selector.component.css']
})
export class FpCanSelectorComponent implements OnInit {
  @Input() applId: number;
  @Input() fseId: number;
  @Input() index = 0;
  @Input() readonly = false;
  selectedCAN: CanCcxDto;

  constructor(private canManagementService: CanManagementService,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.canManagementService.selectCANEmitter.subscribe(next => {
      if ((!next.applId || (Number(this.applId) === Number(next.applId))) && Number(next.fseId) === Number(this.fseId)) {
        this.selectedCAN = next.can;
      }
    });
  }
}
