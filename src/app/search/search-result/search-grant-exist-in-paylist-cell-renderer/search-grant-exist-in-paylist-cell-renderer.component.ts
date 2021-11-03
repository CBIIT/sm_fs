import {Component, Input, OnInit, Output} from '@angular/core';
import {Subject} from "rxjs";

@Component({
  selector: 'app-search-grant-exist-in-paylist-cell-renderer',
  templateUrl: './search-grant-exist-in-paylist-cell-renderer.component.html',
  styleUrls: ['./search-grant-exist-in-paylist-cell-renderer.component.css']
})
export class SearchGrantExistInPaylistCellRendererComponent implements OnInit {

  @Input()
  data : any = {}

  @Output()
  emitter = new Subject<PaylistEntry>();

  paylists: PaylistEntry[] = [];

  constructor() { }

  ngOnInit(): void {
    if (this.data.paylistIdList) {
      this.data.paylistIdList.split(',').forEach((pl) => {
        const entry = pl.split('-');
        this.paylists.push(new PaylistEntry(Number(entry[1]), Number(entry[0])));
      })
    }
  }

  onSelect(pl: PaylistEntry) {
    // if (pl.fy < 2020) {
    //   window.open('i2ecws/api/v1/generate-paylist-report/' + pl.id + '/JR_HISTORICALPAYLIST_REPORT/PDF', '_blank');
    // }
    // else {
    //   alert('To be implemented: open paylist view for ' + pl.id + ' (' + pl.fy + ')');
    // }
    this.emitter.next(pl);
  }

  ngOnDestroy() {
    this.emitter.unsubscribe();
  }
}

class PaylistEntry {
  id: number;
  fy: number;


  constructor(id: number, fy: number) {
    this.id = id;
    this.fy = fy;
  }
}
