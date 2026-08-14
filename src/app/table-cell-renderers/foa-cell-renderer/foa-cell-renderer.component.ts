import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-foa-cell-renderer',
  templateUrl: './foa-cell-renderer.component.html',
  styleUrls: ['./foa-cell-renderer.component.css']
})
export class FoaCellRendererComponent {

   constructor() { }
  foaExists: boolean;
  nosiExists: boolean;
  @Input()
  data : any = {}
  @Input() mode: string;
  ngOnInit(): void {
    if(this.mode === 'NOFO') {
      this.foaExists = true;
    }  else if(this.mode === 'NOSI') {
      this.nosiExists = true;
    }

  }
}
