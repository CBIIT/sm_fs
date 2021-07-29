import { Injectable } from '@angular/core';

@Injectable()
export class NavigationStepModel {
    private stepLinkable: boolean[];
    showSteps = false;

    isStepLinkable(step: number): boolean {
        return this.stepLinkable[step];
      }

    setStepLinkable(step: number, linkable: boolean): void {
        this.stepLinkable[step] = linkable;
    }

    initForFR(): void{
        this.stepLinkable = [false, false, false, false, false];
    }

    initForFP(): void {
        this.stepLinkable = [false, false, false, false, false, false, false];
    }

    disableStepLinks(): void {
        if (this.setStepLinkable) {
            this.stepLinkable.forEach(a => {a = true; });
        }
    }

    enableStepLinks(): void {
        if (this.setStepLinkable) {
            this.stepLinkable.forEach(a => {a = false; });
        }
    }
}
