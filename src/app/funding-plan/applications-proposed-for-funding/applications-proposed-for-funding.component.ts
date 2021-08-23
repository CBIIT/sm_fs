import { Component, Input, OnInit } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { NgForm } from '@angular/forms';
import { PlanCoordinatorService } from '../service/plan-coordinator-service';

@Component({
  selector: 'app-applications-proposed-for-funding',
  templateUrl: './applications-proposed-for-funding.component.html',
  styleUrls: ['./applications-proposed-for-funding.component.css']
})
export class ApplicationsProposedForFundingComponent implements OnInit {
  @Input() parentForm: NgForm;
  comments: string;
  listGrantsSelected: NciPfrGrantQueryDtoEx[];
  listSelectedSources: string[];



  constructor(private logger: NGXLogger, private planModel: PlanModel,
              private planCoordinatorService: PlanCoordinatorService) {
    this.listGrantsSelected = this.planModel.allGrants.filter(g => g.selected);

  }

  ngOnInit(): void {

  }
}
