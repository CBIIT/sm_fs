import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdCaIntegratedComponent } from './pd-ca-integrated.component';

describe('PdCaIntegratedComponent', () => {
  let component: PdCaIntegratedComponent;
  let fixture: ComponentFixture<PdCaIntegratedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PdCaIntegratedComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PdCaIntegratedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
