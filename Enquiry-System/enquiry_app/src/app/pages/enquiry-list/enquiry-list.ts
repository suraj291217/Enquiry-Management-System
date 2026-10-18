import { ChangeDetectionStrategy, Component, computed, effect, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IEnquiry } from '../../model/enquiry.model';
import { CategoryService } from '../../services/category.service';
import { EnquiryService } from '../../services/enquiry.service';
import { StatusService } from '../../services/status.service';
import { Router } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

@Component({
  imports: [CommonModule, FormsModule, MatExpansionModule, MatFormFieldModule, MatInputModule, MatPaginatorModule, MatSelectModule, MatTableModule],
  selector: 'app-enquiry-list',
  styleUrl: './enquiry-list.css',
  templateUrl: './enquiry-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnquiryList {
  private readonly enquiryService = inject(EnquiryService);
  private readonly categoryService = inject(CategoryService);
  private readonly statusService = inject(StatusService);
  private readonly router = inject(Router);

  readonly enquiries = this.enquiryService.getEnquiries;
  readonly categories = this.categoryService.getCategories;
  readonly statuses = this.statusService.getStatuses;
  readonly activeStatuses = computed(() => this.statuses()
    .filter(status => status.isActive)
    .sort((first, second) => (first.displayOrder ?? 0) - (second.displayOrder ?? 0)));
  readonly displayedColumns = ['enquiry', 'customer', 'category', 'status', 'submitted', 'actions'];
  readonly dataSource = new MatTableDataSource<IEnquiry>([]);
  searchTerm = '';
  recordView: 'open' | 'all' | 'trash' = 'open';
  selectedStatusId = '';
  selectedCategoryId = '';
  pageIndex = 0;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 25];

  constructor() {
    effect(() => {
      this.enquiries();
      this.dataSource.data = this.filteredEnquiries;
    });
  }

  @ViewChild(MatPaginator)
  set paginator(paginator: MatPaginator | undefined) {
    this.dataSource.paginator = paginator ?? null;
  }

  get filteredEnquiries(): IEnquiry[] {
    const search = this.searchTerm.trim().toLowerCase();
    return [...this.enquiries()]
      .filter(enquiry => this.recordView === 'trash' ? enquiry.isDeleted === true : !enquiry.isDeleted)
      .filter(enquiry => this.recordView !== 'open' || !this.isClosedOrArchived(enquiry.statusId))
      .filter(enquiry => !this.selectedStatusId || enquiry.statusId.toString() === this.selectedStatusId)
      .filter(enquiry => !this.selectedCategoryId || enquiry.categoryId.toString() === this.selectedCategoryId)
      .filter(enquiry => !search ||
        enquiry.customerName.toLowerCase().includes(search) ||
        `enq-${enquiry.enquiryId.toString().padStart(4, '0')}`.includes(search) ||
        enquiry.enquiryId.toString() === search)
      .sort((first, second) => second.createdDate.localeCompare(first.createdDate));
  }

  get currentPageIndex(): number {
    const lastPageIndex = Math.max(0, Math.ceil(this.filteredEnquiries.length / this.pageSize) - 1);
    return Math.min(this.pageIndex, lastPageIndex);
  }

  get visibleEnquiryCount(): number {
    return Math.min(this.pageSize, Math.max(0, this.filteredEnquiries.length - this.currentPageIndex * this.pageSize));
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
  }

  resetPagination(): void {
    this.pageIndex = 0;
    this.dataSource.data = this.filteredEnquiries;
    this.dataSource.paginator?.firstPage();
  }

  get emptyStateTitle(): string {
    if (!this.enquiries().length) return 'No enquiries yet';
    if (this.recordView === 'trash') return 'Trash is empty';
    return 'No enquiries match these filters';
  }

  get emptyStateMessage(): string {
    if (!this.enquiries().length) return 'Customer submissions will appear here.';
    if (this.recordView === 'trash') return 'Enquiries moved to trash will appear here.';
    return 'Adjust the search or filters to see more records.';
  }

  getEnquiryCode(enquiry: IEnquiry): string {
    return `ENQ-${enquiry.enquiryId.toString().padStart(4, '0')}`;
  }

  getCategoryName(categoryId: number): string {
    return this.categoryService.getCategoryById(categoryId)?.categoryName ?? 'Unknown category';
  }

  getStatusName(statusId: number): string {
    return this.statusService.getStatusById(statusId)?.statusName ?? 'Unknown status';
  }

  getStatusClass(statusId: number): string {
    const status = this.statusService.getStatusById(statusId);
    const normalized = (status?.statusCode || status?.statusName || '')
      .toLowerCase()
      .replaceAll('_', '-')
      .replaceAll(' ', '-');
    return ['new', 'in-progress', 'resolved', 'closed'].includes(normalized)
      ? `status-${normalized}`
      : 'status-custom';
  }

  getStatusStyle(statusId: number): { backgroundColor: string; color: string } | null {
    if (this.getStatusClass(statusId) !== 'status-custom') return null;

    const colors = [
      { backgroundColor: '#e2f1ec', color: '#287c79' },
      { backgroundColor: '#e7f2ff', color: '#2866a7' },
      { backgroundColor: '#fff2cf', color: '#89600a' },
      { backgroundColor: '#f4eafa', color: '#75489a' },
      { backgroundColor: '#fce9e6', color: '#a34e43' },
    ];
    const colorIndex = Math.abs(statusId) % colors.length;
    return colors[colorIndex];
  }

  private isClosedOrArchived(statusId: number): boolean {
    const status = this.statusService.getStatusById(statusId);
    const statusCode = status?.statusCode?.toLowerCase() ?? '';
    const statusName = status?.statusName.toLowerCase() ?? '';
    return statusCode.includes('closed') || statusCode.includes('archived') ||
      statusName.includes('closed') || statusName.includes('archived');
  }

  openDetails(enquiry: IEnquiry): void {
    this.router.navigate(['/admin/enquiries', enquiry.enquiryId]);
  }
}
