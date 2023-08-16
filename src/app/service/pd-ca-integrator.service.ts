import { Injectable } from "@angular/core";
import { Subject } from "rxjs";

@Injectable({ providedIn: 'root' })
export class PdCaIntegratorService {
  pdValueEmitter = new Subject<{ pdId: number, channel: string }>();
  cayCodeEmitter = new Subject<{ cayCode: string | string[], channel: string }>();
  caForDocEmitter = new Subject<{ code: string | string[], channel: string }>();
  docEmitter = new Subject<{ doc:any, channel: string, eventType?: string }>();
  pdLoadingEmitter = new Subject<{channel: string, initialized: boolean}>();
  cayCodeLoadingEmitter = new Subject<{channel: string, initialized: boolean}>();

  constructor() {
  }
}

export const PD_CA_DEFAULT_CHANNEL= 'PD_CA_DEFAULT_CHANNEL';
