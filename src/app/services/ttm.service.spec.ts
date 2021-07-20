import { TestBed } from '@angular/core/testing';

import { TtmService } from './ttm.service';

describe('TtmService', () => {
  let service: TtmService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TtmService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
