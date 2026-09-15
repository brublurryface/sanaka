import { Component, Input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import { RestRequestDetails } from '../rest-api.models';

@Component({
  selector: 'app-rest-request-inspector',
  imports: [TranslocoPipe],
  templateUrl: './rest-request-inspector.html',
  styleUrl: './rest-request-inspector.scss',
})
export class RestRequestInspector {
  @Input({ required: true }) request!: RestRequestDetails;
  @Input({ required: true }) mappedResponse = '{}';
  @Input() status: number | null = null;
  @Input() total: number | null = null;
}
