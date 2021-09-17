import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectedCanRendererComponent } from './projected-can-renderer.component';

describe('ProjectedCanRendererComponent', () => {
  let component: ProjectedCanRendererComponent;
  let fixture: ComponentFixture<ProjectedCanRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProjectedCanRendererComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProjectedCanRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
