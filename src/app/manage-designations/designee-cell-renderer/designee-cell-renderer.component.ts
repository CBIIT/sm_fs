import { Component, Input, OnInit } from '@angular/core';
import { FundingRequestPermDelDto } from "@cbiit/i2ecws-lib/model/fundingRequestPermDelDto";

@Component({
  selector: 'app-designee-cell-renderer',
  templateUrl: './designee-cell-renderer.component.html',
  styleUrls: ['./designee-cell-renderer.component.css']
})
export class DesigneeCellRendererComponent implements OnInit {

  constructor() { }

  @Input() data : FundingRequestPermDelDto = {}

  inactiveTooltip: string;

  ngOnInit(): void {
    if (this.data.inactiveI2eDate) {
      this.inactiveTooltip = "Designee's I2E account has been deactivated";
    }
    else if (this.data.inactiveNedDate) {
      this.inactiveTooltip = "Designee is inactive in NED";
    }
    else if (this.data.newClassification) {
      this.inactiveTooltip = "Designee's NED Classification has been changed from \"Employee\" to \"" + this.data.newClassification + "\"";
    }
    else if (this.data.newNedOrg) {
      this.inactiveTooltip = "Designee's DOC has been changed to " + this.data.newNedOrg + " in NED";
    }
  }

}
