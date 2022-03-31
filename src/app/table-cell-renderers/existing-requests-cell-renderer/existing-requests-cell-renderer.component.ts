import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-existing-requests-cell-renderer',
  templateUrl: './existing-requests-cell-renderer.component.html',
  styleUrls: ['./existing-requests-cell-renderer.component.css']
})
export class ExistingRequestsCellRendererComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  @Input()
  data : any = {}
}
