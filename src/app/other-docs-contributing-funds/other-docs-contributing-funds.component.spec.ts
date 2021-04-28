import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtherDocsContributingFundsComponent } from './other-docs-contributing-funds.component';

describe('OtherDocsContributingFundsComponent', () => {
  let component: OtherDocsContributingFundsComponent;
  let fixture: ComponentFixture<OtherDocsContributingFundsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OtherDocsContributingFundsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OtherDocsContributingFundsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
