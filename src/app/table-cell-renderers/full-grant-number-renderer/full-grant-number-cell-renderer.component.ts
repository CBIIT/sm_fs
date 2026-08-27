import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-full-grant-number-cell-renderer',
  templateUrl: './full-grant-number-cell-renderer.component.html',
  styleUrls: ['./full-grant-number-cell-renderer.component.css']
})
export class FullGrantNumberCellRendererComponent implements OnInit {
  instituteTooltip = 'View Grantee Institution.';

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
  i2eURL=""

  @Input()
  set data(value: any) {
    this._data = value;
    this.instituteTooltip = this.buildInstituteTooltip();
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

  private buildInstituteTooltip(): string {
    const orgName = this.data?.orgName?.trim();
    const city = this.data?.institutionCity?.trim();
    const state = this.data?.institutionState?.trim();

    if (!orgName && !city && !state) {
      return 'View Grantee Institution.';
    }

    const location = [city, state].filter((part: string | undefined) => !!part).join(', ');
    return location ? `${orgName ?? ''}\n${location}`.trim() : orgName ?? 'View Grantee Institution.';
  }
}
