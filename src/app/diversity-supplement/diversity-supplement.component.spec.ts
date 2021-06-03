import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiversitySupplementComponent } from './diversity-supplement.component';

describe('DiversitySupplementComponent', () => {
  let component: DiversitySupplementComponent;
  let fixture: ComponentFixture<DiversitySupplementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ DiversitySupplementComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DiversitySupplementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
