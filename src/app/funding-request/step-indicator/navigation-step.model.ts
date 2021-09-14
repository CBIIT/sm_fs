import { Injectable } from '@angular/core';

@Injectable()
export class NavigationStepModel {
    private stepLinkable: boolean[] = [];
    showSteps = false;

    isStepLinkable(step: number): boolean {
        return this.stepLinkable[step];
      }

    setStepLinkable(step: number, linkable: boolean): void {
        this.stepLinkable[step] = linkable;
    }

    disableStepLinks(start?: number, end?: number): void {
        for (let i = start ? start : 1;
            i <= (end ? end : 6); i++) {
            this.stepLinkable[i] = false;
        }
    }

    enableStepLinks(start?: number, end?: number): void {
        for (let i = start ? start : 1;
            i <= (end ? end : 6 ); i++) {
            this.stepLinkable[i] = true;
        }
    }
}
