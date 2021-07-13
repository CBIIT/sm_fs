import { Component, Input, OnInit } from '@angular/core';
import { Options } from 'select2';

@Component({
  selector: 'app-plan-step1',
  templateUrl: './plan-step1.component.html',
  styleUrls: ['./plan-step1.component.css']
})
export class PlanStep1Component implements OnInit {
  options: Options;

  constructor() { }

  ngOnInit(): void {
  }

}
