import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { NGXLogger } from "ngx-logger";
import { Observable } from "rxjs";
import { TimeoutService } from "../service/timeout.service";

@Injectable()
export class TimeoutInterceptor  implements HttpInterceptor {
    constructor(
        private timeoutService: TimeoutService,
        private logger: NGXLogger) {
        
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(req);
    }
    
}