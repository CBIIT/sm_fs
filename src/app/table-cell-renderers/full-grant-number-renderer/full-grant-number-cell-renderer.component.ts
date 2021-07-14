import {Component, Input, OnInit} from '@angular/core';

@Component({
  selector: 'app-full-grant-number-cell-renderer',
  templateUrl: './full-grant-number-cell-renderer.component.html',
  styleUrls: ['./full-grant-number-cell-renderer.component.css']
})
export class FullGrantNumberCellRendererComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  @Input()
  data : any = {}

  @Input()
  eGrantsUrl=""

  @Input()
  grantViewerUrl=""

}
