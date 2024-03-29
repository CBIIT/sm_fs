import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-open-request',
  templateUrl: './open-request.component.html',
  styleUrls: ['./open-request.component.css']
})
export class OpenRequestComponent implements OnInit {

  frqId: number;
  fprId: number;

  constructor(private router: Router) { }

  ngOnInit(): void {
  }

  openByFrqId(): void {
    this.router.navigate(['request/retrieve', this.frqId]);
  }

  openByFprId(): void {
    this.router.navigate(['plan/retrieve', this.fprId]);
  }
}
