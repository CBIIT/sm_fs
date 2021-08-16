import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FpGrantInformationComponent } from './fp-grant-information.component';

describe('FpGrantInformationComponent', () => {
  let component: FpGrantInformationComponent;
  let fixture: ComponentFixture<FpGrantInformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FpGrantInformationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FpGrantInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
