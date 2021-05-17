import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {RequestModel} from '../model/request-model';
import {LookupsControllerService, NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {Options} from 'select2';
import {CdkDragDrop, moveItemInArray} from '@angular/cdk/drag-drop';


class DocData {
  id: number;
  abbreviation: string;
  description: string;
  selected: boolean;
  order: number;
}

@Component({
  selector: 'app-other-docs-contributing-funds',
  templateUrl: './other-docs-contributing-funds.component.html',
  styleUrls: ['./other-docs-contributing-funds.component.css']
})
export class OtherDocsContributingFundsComponent implements OnInit {
  @Input() label = 'Division/Office/Center (DOC)';

  @Input()
  get selectedValue(): string {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<string>();

  set selectedValue(value: string) {
    console.log('DOC selectedValue setter called ', value);
    const ord = this.selectedDocs().length + 1;
    this.docs.forEach(d => {
      if (d.abbreviation === value) {
        d.selected = true;
        d.order = ord;
      }
    });
    this._selectedValue = this.getSelectionString();
    console.log(this._selectedValue);
    this.selectedValueChange.emit(this.getSelectionString());
  }

  private _selectedValue: string;

  // NOTE: if the following array is typed as Select2OptionData, compilation fails
  // Select2OptionData requires id and text attributes. If the supplied data doesn't
  // have those values, you should modify the data appropriately.
  public docs: Array<DocData> = new Array<DocData>();
  public options: Options;

  constructor(private lookupsControllerService: LookupsControllerService, private requestModel: RequestModel) {
  }

  ngOnInit(): void {
    this.options = {};
    if (!this.docs) {
      this.docs = new Array<DocData>();
    }

    this.lookupsControllerService.getNciDocsUsingGET().subscribe(
      result => {
        console.log('Getting the Doc Dropdown results');
        // result.push({id: '', abbreviation: '', description: ''});
        result.forEach(r => {
          console.log(r);
          this.docs.push({selected: false, id: r.id, abbreviation: r.abbreviation, description: r.description, order: 0});
          // console.log({id: r.abbreviation, text: r.abbreviation + ' - ' + r.description});
        });
        // this.docs = result;
      }, error => {
        console.log('HttpClient get request error for----- ' + error.message);
      });

  }

  availableDocs(): Array<DocData> {
    return this.docs.filter(d => !d.selected);
  }

  selectedDocs(): Array<DocData> {
    return this.docs.filter(d => d.selected).sort((d1, d2) => {
      return d1.order - d2.order;
    });
  }

  deselect(abbreviation: string): void {
    this.docs.forEach(d => {
      if (d.abbreviation === abbreviation) {
        d.selected = false;
      }
    });
  }

  getSelectionString(): string {
    const dox = this.selectedDocs().map(d => d.abbreviation);
    if (!dox || dox.length === 0) {
      return '';
    }

    return dox.join();
  }

  dropped(event: CdkDragDrop<DocData[]>): void {
    console.log(JSON.stringify(event));
    moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
  }
}
