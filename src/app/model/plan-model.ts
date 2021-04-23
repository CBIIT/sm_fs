import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PlanModel {
  grant: any;

  constructor() {
    this.grant = {};
  }
}
