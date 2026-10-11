import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Common {
  $onLogin: Subject<void> = new Subject<void>();
}
