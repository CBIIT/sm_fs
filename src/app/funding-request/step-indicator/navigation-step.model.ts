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

    disableStepLinks(): void {
        this.stepLinkable = [];
    }

    enableStepLinks(): void {
        // first 1 step is never linked.
        for (let i = 2; i <= 6; i++) {
            this.stepLinkable[i] = true;
        }
    }
}
