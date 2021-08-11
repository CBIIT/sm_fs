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

  private _data : any = {}
  private _minScore : number = -1
  private _maxScore : number = -1

  get data() : any { return this._data }
  get minScore() : number { return this._minScore}
  get maxScore() : number { return this._maxScore}

  @Input()
  eGrantsUrl=""

  @Input()
  grantViewerUrl=""

  @Input()
  set data(value: any) {
    this._data = value;
    if (this.data && this._minScore >= 0 && this._maxScore >= 0) {
      this.skip = this.isSkip();
      this.exception = this.isException();
    }
  }

  @Input()
  set minScore(value: number) {
    this._minScore = value;
    if (this.data && this._minScore >= 0 && this._maxScore >= 0) {
      this.skip = this.isSkip();
      this.exception = this.isException();
    }
  }

  @Input()
  set maxScore(value: number) {
    this._maxScore = value;
    if (this.data && this._minScore >= 0 && this._maxScore >= 0) {
      this.skip = this.isSkip();
      this.exception = this.isException();
    }
  }

  skip: boolean = false;
  exception: boolean = false;

  private isSkip() {
    return (!this.data.selected && this.data.priorityScoreNum &&
             this.data.priorityScoreNum >= this.minScore && this.data.priorityScoreNum <= this.maxScore);
  }

  private isException() {
    return (this.data.selected && this.data.priorityScoreNum &&
            this.data.priorityScoreNum > this.maxScore);
  }
}
