import {Directive} from "@angular/core";
import {AbstractControl, AsyncValidator, NG_ASYNC_VALIDATORS, ValidationErrors, Validator} from "@angular/forms";
import {FsRequestControllerService} from "@nci-cbiit/i2ecws-lib";
import {RequestModel} from "../model/request-model";
import {Observable} from "rxjs";
import {NGXLogger} from "ngx-logger";

@Directive({
  selector: '[appActiveInitialPayValidator]',
  providers: [{provide: NG_ASYNC_VALIDATORS, useExisting: ActiveInitialPayValidatorDirective, multi: true}]
})
export class ActiveInitialPayValidatorDirective implements AsyncValidator {
  constructor(private fsRequestService: FsRequestControllerService, private requestModel: RequestModel,
              private logger: NGXLogger) {
    this.logger.debug('construction junction');
  }

  validate(control: AbstractControl): Promise<ValidationErrors | null> | Observable<ValidationErrors | null> {
    const requestType = control?.value;

    if (!control || isNaN(control.value)) {
      return new Promise(resolve => {
        this.requestModel.initialPay = undefined;
        resolve(null);
      });
    }

    this.logger.debug("checking for initial pay");
    return new Promise(resolve => {
      this.fsRequestService.checkInitialPayUsingGET(this.requestModel.grant.applId, Number(control.value)).subscribe(result => {
        if (isNaN(result) || Number(result) === 0) {
          this.requestModel.initialPay = undefined;
          resolve(null);
        } else {
          this.requestModel.initialPay = Number(result) !== 0 ? result : undefined;
          resolve({initialPayGrantExists: true});
        }
      });
    });
  }
}
