import { Component, OnInit } from '@angular/core';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-unauthorize',
  templateUrl: './unauthorize.component.html',
  styleUrls: ['./unauthorize.component.css']
})
export class UnauthorizeComponent implements OnInit {

  techSupport: String;

  constructor() { }

  ngOnInit(): void {
    this.techSupport = environment.techSupport;
  }

}
