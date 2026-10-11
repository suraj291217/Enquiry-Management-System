import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusMaster } from './status-master';

describe('StatusMaster', () => {
  let component: StatusMaster;
  let fixture: ComponentFixture<StatusMaster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusMaster],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusMaster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
