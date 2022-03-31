import { Alert } from './alert';

export class AlertQueue {
  _queue: Alert[] = [];

  get queue(): Alert[] {
    return this._queue;
  }
}
