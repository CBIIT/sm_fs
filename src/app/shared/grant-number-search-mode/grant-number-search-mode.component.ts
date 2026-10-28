import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MAX_GRANT_NUMBER_COUNT, parseGrantNumbers } from './grant-number-parser';

export type GrantNumberSearchMode = 'single' | 'multiple';

@Component({
  selector: 'app-grant-number-search-mode',
  templateUrl: './grant-number-search-mode.component.html',
  styleUrls: ['./grant-number-search-mode.component.css']
})
export class GrantNumberSearchModeComponent {
  @Input() form: NgForm;
  @Input() mode: GrantNumberSearchMode = 'single';
  @Input() multipleGrantNumbers = '';

  @Output() modeChange = new EventEmitter<GrantNumberSearchMode>();
  @Output() multipleGrantNumbersChange = new EventEmitter<string>();

  onModeChange(mode: GrantNumberSearchMode): void {
    this.modeChange.emit(mode);
  }

  onMultipleGrantNumbersChange(value: string): void {
    this.multipleGrantNumbersChange.emit(value);
  }

  get multipleGrantNumberCount(): number {
    return parseGrantNumbers(this.multipleGrantNumbers || '').length;
  }

  get multipleGrantNumberValidationMessage(): string | null {
    const count = this.multipleGrantNumberCount;
    if (count === 0) {
      return 'At least one Grant Number is required.';
    }

    if (count > MAX_GRANT_NUMBER_COUNT) {
      return 'Do not exceed 1,000 Grant Numbers.';
    }

    return null;
  }
}
