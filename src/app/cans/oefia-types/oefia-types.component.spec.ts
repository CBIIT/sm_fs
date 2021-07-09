import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OefiaTypesComponent } from './oefia-types.component';

describe('OefiaTypesComponent', () => {
  let component: OefiaTypesComponent;
  let fixture: ComponentFixture<OefiaTypesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OefiaTypesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OefiaTypesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
