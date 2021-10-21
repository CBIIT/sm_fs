import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
  }
)
export class NavigationStepModel {
  private stepLinkable: boolean[] = [];
  private stepComplete: boolean[] = [true, true, true, true, true, true, true];
  showSteps = false;

  isStepLinkable(step: number): boolean {
    return this.stepLinkable[step];
  }

  setStepLinkable(step: number, linkable: boolean): void {
    this.stepLinkable[step] = linkable;
  }

  setStepComplete(step: number, linkable: boolean): void {
    this.stepComplete[step] = linkable;
  }

  isStepComplete(step: number): boolean {
    return this.stepComplete[step];
  }

  disableStepLinks(start?: number, end?: number): void {
    for (let i = start ? start : 1;
         i <= (end ? end : 6); i++) {
      this.stepLinkable[i] = false;
    }
  }

  enableStepLinks(start?: number, end?: number): void {
    for (let i = start ? start : 1;
         i <= (end ? end : 6); i++) {
      this.stepLinkable[i] = true;
    }
  }
}
