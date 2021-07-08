import {Component, Input, OnInit} from '@angular/core';
import {CanManagementService} from '../service/can-management-service';
import {RequestModel} from '../model/request-model';
import {NGXLogger} from 'ngx-logger';
import {CanCcxDto} from '@nci-cbiit/i2ecws-lib';

@Component({
  selector: 'app-can-selector',
  templateUrl: './can-selector.component.html',
  styleUrls: ['./can-selector.component.css']
})
export class CanSelectorComponent implements OnInit {

  @Input() nciSourceFlag: string;
  @Input() selectedCan: CanCcxDto;
  defaultCans: CanCcxDto[];

  constructor(private canService: CanManagementService,
              private requestModel: RequestModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.canService.getCans(this.nciSourceFlag).subscribe(result => {
      this.defaultCans = result;
    });
  }
}
