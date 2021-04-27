import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrantInformationComponent } from './grant-information.component';

describe('GrantInformationComponent', () => {
  let component: GrantInformationComponent;
  let fixture: ComponentFixture<GrantInformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GrantInformationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GrantInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
