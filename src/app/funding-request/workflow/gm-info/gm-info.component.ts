import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-gm-info',
  templateUrl: './gm-info.component.html',
  styleUrls: ['./gm-info.component.css']
})
export class GmInfoComponent implements OnInit {

  model: any;

  options: any;

  constructor() { }

  ngOnInit(): void {
  }

}
