import {Component, OnInit} from '@angular/core';
import {NGXLogger} from "ngx-logger";
import {CanManagementService} from "../service/can-management-service";

@Component({
  selector: 'app-budget-info',
  templateUrl: './budget-info.component.html',
  styleUrls: ['./budget-info.component.css']
})
export class BudgetInfoComponent implements OnInit {

  constructor(private logger: NGXLogger, private canService: CanManagementService) {
  }

  ngOnInit(): void {
    this.logger.debug(this.canService.defaultCans);
    this.logger.debug(this.canService.grantCans);
  }

}
