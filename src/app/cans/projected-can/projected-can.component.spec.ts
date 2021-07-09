import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectedCanComponent } from './projected-can.component';

describe('ProjectedCanComponent', () => {
  let component: ProjectedCanComponent;
  let fixture: ComponentFixture<ProjectedCanComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProjectedCanComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectedCanComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
