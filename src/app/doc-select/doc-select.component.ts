import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ControlContainer, NgForm } from "@angular/forms";
import { Options } from "select2";
import { LookupsControllerService } from "@cbiit/i2ecommonws-lib";
import { NGXLogger } from "ngx-logger";

@Component({
  selector: 'app-doc-select',
  templateUrl: './doc-select.component.html',
  styleUrls: ['./doc-select.component.css'],
  viewProviders: [{ provide: ControlContainer, useExisting: NgForm }],
})
export class DocSelectComponent implements OnInit {

  @Input() label = 'Division/Office/Center (DOC)';
  @Input() name = 'doc';
  @Input() maxSelection = -1;

  public docs: any[] = [];
  public options: Options;

  @Input()
  get selectedValue(): string[] {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<string[]>();

  set selectedValue(value: string[]) {
    this._selectedValue = value;
    this.selectedValueChange.emit(value);
  }

  private _selectedValue: string[] = [];

  constructor(private lookupsControllerService: LookupsControllerService, private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.options = {};
    const multi = (Number(this.maxSelection) !== Number(1));
    this.options.multiple = multi;
    if (multi && this.maxSelection !== -1) {
      this.options.maximumSelectionLength = this.maxSelection;
    }

    this.lookupsControllerService.getNciDocs().subscribe(
      result => {
        this.docs = result;
      },
      error => {
        this.logger.error('Error when calling getNciDocs ', error);
      });
  }

  isSelected(value: string): boolean {
    return (this._selectedValue && this._selectedValue.indexOf(value) > -1);
  }
}
