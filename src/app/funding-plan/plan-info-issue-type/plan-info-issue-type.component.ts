import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-plan-info-issue-type',
  templateUrl: './plan-info-issue-type.component.html',
  styleUrls: ['./plan-info-issue-type.component.css']
})
export class PlanInfoIssueTypeComponent implements OnInit {
  @Input() rfaNumber: string;

  constructor() {
  }

  ngOnInit(): void {
  }

}
