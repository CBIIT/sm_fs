import { Component, OnInit } from '@angular/core';
import {NGXLogger} from "ngx-logger";
import {CanManagementService} from "../service/can-management-service";
import {OefiaCodingDto} from "@nci-cbiit/i2ecws-lib";

@Component({
  selector: 'app-oefia-types',
  templateUrl: './oefia-types.component.html',
  styleUrls: ['./oefia-types.component.css']
})
export class OefiaTypesComponent implements OnInit {

  constructor(private logger: NGXLogger, private canService: CanManagementService) { }

  ngOnInit(): void {
  }

  oefiaCodes(): OefiaCodingDto[] {
    return this.canService.oefiaCodes;
  }

}
