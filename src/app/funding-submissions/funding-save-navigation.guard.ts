import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { FundingSaveProgressService } from './funding-save-progress.service';

export const fundingSaveNavigationGuard: CanDeactivateFn<unknown> = () =>
  !inject(FundingSaveProgressService).active;
