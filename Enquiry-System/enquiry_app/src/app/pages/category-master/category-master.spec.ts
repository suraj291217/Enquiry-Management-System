import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryMaster } from './category-master';

describe('CategoryMaster', () => {
  let component: CategoryMaster;
  let fixture: ComponentFixture<CategoryMaster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryMaster],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryMaster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
