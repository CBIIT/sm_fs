import { Component, EventEmitter, Input, OnInit, Output } from "@angular/core";
import { ControlContainer, NgForm } from "@angular/forms";
import { Options } from "select2";
import { LookupsControllerService } from "@cbiit/i2ecommonws-lib";
import { CancerActivitiesDto, CancerActivityControllerService } from "@cbiit/i2erefws-lib";
import { isNumeric } from "rxjs/internal-compatibility";
import { PD_CA_DEFAULT_CHANNEL, PdCaIntegratorService } from "../service/pd-ca-integrator.service";
import { NGXLogger } from "ngx-logger";
@Component({
  selector: 'app-cancer-activities-dropdown',
  templateUrl: './cancer-activities-dropdown.component.html',
  styleUrls: ['./cancer-activities-dropdown.component.css'],
  viewProviders: [{provide: ControlContainer, useExisting: NgForm}],
})
export class CancerActivitiesDropdownComponent implements OnInit {

  public cancerActivities: Array<CancerActivitiesDto>;
  public options: Options;
  private _npnId = -1;
  private _selectedValue: string [] | string;

  @Input() debug = false;
  @Input() monitorFlag = false;
  @Input() selectSingleOption = false;
  @Input() label = 'Cancer Activity';
  @Input() maxSelection = -1;
  @Input() syncWithPd = true;
  @Input() name = 'cancerActivities';
  @Input() activeOnly: boolean = null;


  @Input() broadcast = false;
  @Input() lockedOptions: string[] = [];
  @Input() channel = PD_CA_DEFAULT_CHANNEL;
  private caDocs = [];

  @Input()
  get npnId(): number {
    return this._npnId;
  }

  @Output() npnIdChange = new EventEmitter<number>();

  set npnId(value: number) {
    this._npnId = value;
    this.logger.info(`Setting npnId to ${value} - refresh CAs`);
    this.updateDropdown();
    this.npnIdChange.emit(value);
  }

  @Input()
  get selectedValue(): string[] | string {
    return this._selectedValue;
  }

  @Output() selectedValueChange = new EventEmitter<string[] | string>();

  set selectedValue(values: string[] | string) {
    this._selectedValue = Array.isArray(values) && values.length === 0 ? null : values;
    this.selectedValueChange.emit(this._selectedValue);
    if (this.broadcast) {
      this.pdCaIntegratorService.cayCodeEmitter.next({cayCode: this._selectedValue, channel: this.channel});
    }
    const docsList = typeof values === 'string' ? this.caDocs[values] : values?.map(doc => this.caDocs[doc]);
    this.pdCaIntegratorService.docEmitter.next({doc: docsList ? docsList : null, channel: this.channel, eventType: "CA_EVENT"});
  }

  constructor(
    private caService: CancerActivityControllerService,
    private lookupService: LookupsControllerService,
    private pdCaIntegratorService: PdCaIntegratorService,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    this.options = {};
    const multi = (Number(this.maxSelection) !== Number(1));
    if (multi) {
      this.options.multiple = true;
      this.options.allowClear = false;
      if(this.maxSelection !== -1) {
        this.options.maximumSelectionLength = this.maxSelection;
      }
    } else {
      this.options.allowClear = true;
    }

    if(this.debug) {
      this.logger.info(`Init with options: ${JSON.stringify(this.options)}`);
    }

    if (this.syncWithPd) {
      this.pdCaIntegratorService.pdLoadingEmitter.subscribe(next => {
        if(next.channel === this.channel && next.initialized) {
          if(this.debug) {
            this.logger.info('PD Loading complete: update dropdown()');
          }
          this.updateDropdown();
        }
      });
      this.pdCaIntegratorService.pdValueEmitter.subscribe(payload => {
        if (payload.channel === this.channel) {
          if(this.debug) {
            this.logger.info(`Syncing with PD on channel ${this.channel} => new PD: ${payload.pdId}`);
          }
          const selectedPd = payload.pdId;
          if (isNumeric(selectedPd) && selectedPd > 0) {
            this._npnId = Number(selectedPd);
          } else {
            this._npnId = -1;
          }
          this.updateDropdown();
        }
      });
    } else {
      if(this.debug) {
        this.logger.info('Not syncing with PD');
      }
      this.updateDropdown();
    }

    this.lookupService.getDocAndCayCodes().subscribe(
      result => {
        result.forEach((element) => {
          this.caDocs[element.code] = element.nonAbbreviation;
        });
        this.updateDropdown();
      },
      error => {
        console.error('Error when calling getDocAndCayCodes ', error);
      });
  }

  private updateDropdown(): void {
    this.pdCaIntegratorService.cayCodeLoadingEmitter.next({channel: this.channel, initialized: false});
    this.evoke().subscribe(
      result => {
        result.forEach(element => {
          element.abbreviation = this.caDocs[element.code] ? this.caDocs[element.code] : '';
          element.referralDescription = element.referralDescription +
            (this.caDocs[element.code] ? ' (' + this.caDocs[element.code] + ')' : '');
        });
        this.cancerActivities = this.prune(result);
        if (this.lockedOptions.length !== 0) {
          this.selectedValue = this.lockedOptions;
        }
        if ((this.cancerActivities as Array<any>).length === 1) {
          const ca: string = (this.cancerActivities as Array<any>)[0].code;
          if (this.selectSingleOption) {
            if (ca) {
              this.selectedValue = ca;
            }
          }
        }
        if (this.selectedValue && this.selectedValue.length) {
          this.pdCaIntegratorService.caForDocEmitter.next({code: this.selectedValue, channel: this.channel});
        } else if (this._npnId !== -1) {
          this.pdCaIntegratorService.caForDocEmitter.next({code: this.cancerActivities.map((a: any) => a.code), channel: this.channel});
        } else {
          this.pdCaIntegratorService.caForDocEmitter.next({code: null, channel: this.channel});
        }
        this.pdCaIntegratorService.cayCodeLoadingEmitter.next({channel: this.channel, initialized: true});

      }, error => {
        this.logger.error('Error updating cayCode dropdown', error);
        console.error('HttpClient get request error for----- ' + error.message);
      });
  }

  prune(input: any[]): any[] {
    if (this.lockedOptions.length === 0) {
      return input;
    }
    const result = [];
    input.forEach(elem => {
      if (this.lockedOptions.includes(elem.code)) {
        result.push(elem);
      }
    });

    return result;
  }

  evoke(): any {
    if (this._npnId === -1) {
      if(this.debug) {
        this.logger.info(`allActiveCas(${this.activeOnly})`);
      }
      return this.caService.getAllActiveCaList(this.activeOnly);
    } else {
      if(this.debug) {
        this.logger.info(`getCasForPd(${this._npnId}, ${this.monitorFlag})`);
      }
      return this.caService.getCasForPd(this._npnId, this.monitorFlag);
    }
  }

  isSelected(value): boolean {
    return (this._selectedValue && this._selectedValue.indexOf(value) > -1);
  }
}
