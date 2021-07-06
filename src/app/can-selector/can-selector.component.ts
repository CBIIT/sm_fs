import {Component, OnInit} from '@angular/core';
import {CanManagementService} from "../service/can-management-service";
import {RequestModel} from "../model/request-model";
import {NGXLogger} from "ngx-logger";

@Component({
  selector: 'app-can-selector',
  templateUrl: './can-selector.component.html',
  styleUrls: ['./can-selector.component.css']
})
export class CanSelectorComponent implements OnInit {

  constructor(private canService: CanManagementService,
              private requestModel: RequestModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
  }

  get defaultCans() {
    return this.canService.defaultCans;
  }

}
