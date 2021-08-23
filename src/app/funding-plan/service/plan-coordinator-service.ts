import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PlanCoordinatorService {
  fundingSourceValuesEmitter = new Subject<{ pd: number, ca: string }>();
  grantInfoCostEmitter = new Subject<{index: number, dc: number, tc: number}>();
}
