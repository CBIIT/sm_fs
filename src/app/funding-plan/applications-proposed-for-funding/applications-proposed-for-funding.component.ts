import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-applications-proposed-for-funding',
  templateUrl: './applications-proposed-for-funding.component.html',
  styleUrls: ['./applications-proposed-for-funding.component.css']
})
export class ApplicationsProposedForFundingComponent implements OnInit {
  comments: string;

  constructor() { }

  ngOnInit(): void {
  }

}
