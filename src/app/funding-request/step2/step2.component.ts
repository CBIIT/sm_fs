import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-step2',
  templateUrl: './step2.component.html',
  styleUrls: ['./step2.component.css']
})
export class Step2Component implements OnInit {

  constructor(private router:Router) { }

  ngOnInit(): void {
  }

  nextStep() {
    this.router.navigate(['/request/step3']);
  }

  prevStep() {
    this.router.navigate(['/request/step1']);
  }

}
