import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Maya } from './maya';

describe('Maya', () => {
  let component: Maya;
  let fixture: ComponentFixture<Maya>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Maya],
    }).compileComponents();

    fixture = TestBed.createComponent(Maya);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
