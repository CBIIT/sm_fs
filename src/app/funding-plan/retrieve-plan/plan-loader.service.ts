import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import { PlanModel } from '../../model/plan/plan-model';

@Injectable({ providedIn: 'root' })
export class PlanLoaderService {
  constructor(
    private logger: NGXLogger,
    private planModel: PlanModel) {
  }

}
