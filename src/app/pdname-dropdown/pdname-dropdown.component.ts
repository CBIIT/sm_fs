import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ControlContainer, NgForm } from "@angular/forms";
import { Select2OptionData } from "ng-select2";
import { Options } from "select2";
import { PdControllerService } from "@cbiit/i2erefws-lib";
import * as $ from "jquery";
import { PD_CA_DEFAULT_CHANNEL, PdCaIntegratorService } from "../service/pd-ca-integrator.service";
import { NGXLogger } from "ngx-logger";

@Component({
  selector: 'app-pdname-dropdown',
  templateUrl: './pdname-dropdown.component.html',
  styleUrls: ['./pdname-dropdown.component.css'],
  viewProviders: [{provide: ControlContainer, useExisting: NgForm}],
})
export class PdnameDropdownComponent implements OnInit {
  public pdNames: Array<Select2OptionData>;
  public options: Options;

  constructor(
    private pdService: PdControllerService,
    private pdCaIntegratorService: PdCaIntegratorService,
    private logger: NGXLogger) {
  }

  @Input() debug = false;
  @Input() label = 'PD Name';
  @Input() showInactiveToggle = true;
  @Input() broadcast = false;
  @Input() cayCodes: string[] = [];
  @Input() activeCayOnly = false;
  @Input() filterOnNoActiveCay = false;
  @Input() allowClear = false;
  @Input() name = 'pdName';
  @Input() syncWithCa = false;
  @Input() channel = PD_CA_DEFAULT_CHANNEL;
  private _selectedCayCodes: string[] = [];
  private _inactivePd = false;

  @Input()
  get selectedCayCodes(): string[] {
    return this._selectedCayCodes;
  }

  @Output() selectedCayCodesChange = new EventEmitter<string[]>();

  set selectedCayCodes(value: string[]) {
    this._selectedCayCodes = value;
    this.populatePds();
    this.selectedCayCodesChange.emit(value);
  }

  @Input()
  get selectedValue(): number {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<number>();

  set selectedValue(value: number) {
    if(this.debug) {
      this.logger.debug(`setSelectedValue(${value})`);
    }
    this._selectedValue = value;

    this.selectedValueChange.emit(value);

    if (this.broadcast) {
      this.pdCaIntegratorService.pdValueEmitter.next({pdId: this._selectedValue, channel: this.channel});
    }
  }

  private _selectedValue: number;

  onCheckboxChange(e): void {
    this._inactivePd = e.target.checked;
    this.populatePds();
  }

  private populatePds(resetPd: number = null): void {
    this.pdCaIntegratorService.pdLoadingEmitter.next({channel: this.channel, initialized: false});
    const onlyActive = this._inactivePd ? 'N' : 'Y';
    if(this.debug) {
      this.logger.info(`populatePds(${resetPd}) => onlyActive: ${onlyActive}`);
    }
    this.evoke(onlyActive).subscribe(
      result => {
        result.forEach(element => {
          const cayCodes = this.activeCayOnly ? element.activeCayCodes : element.cayCodes;

          element.id = element.personId;
          element.pdNameCode = element.text;
          if (cayCodes) {
            element.text = element.text + cayCodes;
          }
        });
        if (this.filterOnNoActiveCay) {
          this.pdNames = result.filter(r => !!r.activeCayCodes);
        } else {
          this.pdNames = result;
        }
        if (resetPd) {
          this.selectedValue = resetPd;
        }
        this.pdCaIntegratorService.pdLoadingEmitter.next({channel: this.channel, initialized: true});

      },
      error => {
        console.error('HttpClient get request error for----- ' + error.message);
      });
  }

  evoke(onlyActive: string): any {
    if (this.cayCodes && !(this.cayCodes.length === 0)) {
      if(this.debug) {
        this.logger.info(`getPdsByCayCodes(${this.cayCodes})`)
      }
      return this.pdService.getPdsByCayCodes(typeof this.cayCodes === 'string' ? [this.cayCodes] : this.cayCodes);
    }
    if (this.syncWithCa && this._selectedCayCodes && !(this._selectedCayCodes.length === 0)) {
      if(this.debug) {
        this.logger.info(`getPdsByCayCodes(${this._selectedCayCodes}) (selectedCayCodes)`)
      }
      return this.pdService.getPdsByCayCodes(typeof this._selectedCayCodes === 'string' ? [this._selectedCayCodes] : this._selectedCayCodes);
    }
    if(this.debug) {
      this.logger.info(`getPdList(${onlyActive})`)
    }
    return this.pdService.getPDList(onlyActive);
  }

  ngOnInit(): void {
    // TODO: can this be parameterized with an Angular template?
    this.options = {
      templateResult: pdFormatter.bind(this),
      templateSelection: pdSelection
    };
    if (this.syncWithCa) {
      this.pdCaIntegratorService.cayCodeEmitter.subscribe((payload) => {
        if(payload.channel === this.channel) {
          if(this.debug) {
            this.logger.info(`Syncing with CA on channel ${this.channel} => new cayCode: ${payload.cayCode}`);
          }
          const selectedCayCodes = payload.cayCode;
          if (selectedCayCodes && !(selectedCayCodes.length === 0)) {
            this._selectedCayCodes = [];
            this._selectedCayCodes = selectedCayCodes as string[];
            this.populatePds(this._selectedValue);
          } else if(!this._selectedValue) {
            this.selectedValue = null;
            this._selectedCayCodes = [];
            this.populatePds();
          }
        }
      });
    }
    this.populatePds();
  }
}

function pdFormatter(data): any {
  const cayCodes = this.activeCayOnly ? data.activeCayCodes : data.cayCodes;

  if (!data.id || !cayCodes) {
    return data.pdNameCode;
  }
  return $(
    '<span>' + data.pdNameCode + '</span><br /><span class="secondary-info">Cancer Activities:&nbsp;' + cayCodes + '</span>'
  );
}

function pdSelection(data): any {
  return data.pdNameCode;
}
