import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FpProjectedCanComponent } from './fp-projected-can.component';

describe('FpProjectedCanComponent', () => {
  let component: FpProjectedCanComponent;
  let fixture: ComponentFixture<FpProjectedCanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FpProjectedCanComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FpProjectedCanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
