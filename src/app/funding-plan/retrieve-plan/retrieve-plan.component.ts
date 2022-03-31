import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from 'src/app/model/plan/plan-model';
import { PlanLoaderService } from './plan-loader.service';

@Component({
  selector: 'app-retrieve-plan',
  templateUrl: './retrieve-plan.component.html',
  styleUrls: ['./retrieve-plan.component.css']
})
export class RetrievePlanComponent implements OnInit {
  fprId: number;
  path: string;
  error = '';

  constructor(private router: Router,
              private planLoaderService: PlanLoaderService,
              private route: ActivatedRoute,
              private planModel: PlanModel,
              private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.fprId = this.route.snapshot.params.fprId;
    this.path = '/plan/step6';

    if (this.fprId) {
      this.planLoaderService.loadPlan(this.fprId, this.successFn.bind(this), this.errorFn.bind(this));
    } else {
      this.error = 'not found';
    }
  }

  successFn(): void {
    this.planModel.title = 'View Plan Details for';
    this.planModel.returnToSearchLink = true;
    this.router.navigate([this.path]);
  }

  errorFn(e: string): void {
    this.error = e;
  }



}
