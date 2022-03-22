import { Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';
import {Router} from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class NavigationModel {

  idList: number[] = [];
  show: boolean;
  prev: boolean;
  next: boolean;
  current: number;
  total: number;

  route: string;

  constructor(private router: Router,
              private logger: NGXLogger) {
    this.reset();
  }

  reset(): void {
    this.idList = [];
    this.show = false;
    this.prev = false;
    this.next = false;
    this.current = -1;
    this.total = -1;
  }

  set(ids: number[], path: string): void {
    this.idList = ids;
    this.show = ids.length > 0;
    this.prev = false;
    this.next = ids.length > 1;
    this.current = ids.length > 0 ? 0 : -1;
    this.total = ids.length;
    this.route = path;
  }

  onPrevious($event: any): void {
    $event.preventDefault();
    if (this.current > 0) {
      this.current--;
      this.prev = this.current > 0;
      this.next = this.current < this.total;
      this.navigate();
    }
  }

  onNext($event: any): void {
    $event.preventDefault();
    if (this.current < this.total - 1) {
      this.current++;
    }
    this.prev = this.current > 0;
    this.next = this.current < this.total - 1;
    this.navigate();
  }

  navigate(): void {
    this.logger.debug('Navigate to ', this.route, this.idList[this.current]);
    this.router.navigate([this.route, this.idList[this.current]]);
  }
}
