import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subscription } from 'rxjs';
import { FundingSaveProgressService } from './funding-save-progress.service';

@Component({
  selector: 'app-funding-save-overlay',
  template: `
    <div *ngIf="active" class="dimmer funding-save-overlay" role="status" aria-live="polite" aria-busy="true">
      <div class="loading"><div class="spinner"></div></div>
      <span class="visually-hidden">Saving, please wait</span>
    </div>
  `
})
export class FundingSaveOverlayComponent implements OnInit, OnDestroy {
  active = false;
  private subscription: Subscription;
  private previousFocus: HTMLElement | null = null;
  private readonly blockKeys = (event: KeyboardEvent): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  constructor(private saveProgress: FundingSaveProgressService,
              @Inject(DOCUMENT) private document: Document) {}

  ngOnInit(): void {
    this.subscription = this.saveProgress.active$.subscribe(active => active ? this.block() : this.release());
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.release();
  }

  private block(): void {
    if (this.active) return;
    this.active = true;
    const focused = this.document.activeElement as HTMLElement | null;
    this.previousFocus = focused && focused !== this.document.body ? focused : null;
    this.previousFocus?.blur();
    this.document.addEventListener('keydown', this.blockKeys, true);
  }

  private release(): void {
    if (!this.active) return;
    this.active = false;
    this.document.removeEventListener('keydown', this.blockKeys, true);
    const previous = this.previousFocus;
    this.previousFocus = null;
    const focusIsIdle = !this.document.activeElement || this.document.activeElement === this.document.body;
    if (previous?.isConnected && focusIsIdle) previous.focus();
  }
}
