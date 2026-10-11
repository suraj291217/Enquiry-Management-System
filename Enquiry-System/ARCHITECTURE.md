# Enquiry Management System - Architecture Documentation

## Overview
This is a modern Angular 22 enquiry management system built with reactive patterns, signals, and proper component communication. All data is stored in localStorage (no API calls).

## Project Structure

```
enquiry_app/
├── src/app/
│   ├── guards/
│   │   └── auth.guard.ts          # Route protection
│   ├── model/
│   │   ├── user.model.ts          # User interface
│   │   ├── category.model.ts      # Category interface
│   │   ├── status.model.ts        # Status interface
│   │   └── enquiry.model.ts       # Enquiry interface
│   ├── services/
│   │   ├── auth.service.ts        # Authentication management
│   │   ├── category.service.ts    # Category CRUD operations
│   │   ├── status.service.ts      # Status CRUD operations
│   │   ├── enquiry.service.ts     # Enquiry CRUD operations
│   │   └── common.ts              # Shared event bus
│   ├── shared/
│   │   └── components/
│   │       └── status-badge/      # Reusable status badge component
│   └── pages/
│       ├── login/                 # Login page
│       ├── category-master/       # Category management
│       ├── status-master/         # Status management
│       ├── new-enquiry/           # Create enquiry form
│       └── enquiry-list/          # View all enquiries
```

## Core Concepts Implemented

### 1. **Injectable Services (Centralized State)**
All data is managed through injectable services that act as single sources of truth:

- **AuthService**: Manages user authentication state
- **CategoryService**: Manages categories with localStorage persistence
- **StatusService**: Manages statuses with default initialization
- **EnquiryService**: Manages enquiries

Each service uses Angular `signal()` for reactive state management.

### 2. **Signals (Reactive State)**
- All services expose readonly signals
- Components consume these signals directly
- Automatic change detection when data changes
- Example:
  ```typescript
  // Service
  private categoriesData = signal<ICategory[]>([]);
  getCategories = this.categoriesData.asReadonly();
  
  // Component
  categoryList = this.categoryService.getCategories;
  ```

### 3. **Change Detection Strategy**
All components use `ChangeDetectionStrategy.OnPush` for optimal performance:
- Only re-renders when inputs change or signals update
- More predictable rendering behavior
- Better performance for large lists

### 4. **Component Communication Patterns**

#### **Input() Pattern** (Used in shared components)
```typescript
// status-badge.component.ts
isActive = input.required<boolean>();
label = input<string>('');

// Usage in parent
<app-status-badge [isActive]="item.isActive" [label]="item.statusName" />
```

#### **Output() Pattern** (For child-to-parent events)
Ready to be implemented for enquiry form submission and filters.

#### **Service-based Communication**
- `Common` service with RxJS Subject for login/logout events
- Services automatically notify all subscribers when data changes

### 5. **Auth Guard**
Protected routes require authentication:
```typescript
{
  path: 'status',
  component: StatusMaster,
  canActivate: [authGuard],
}
```

### 6. **Data Persistence**
All data stored in localStorage with these keys:
- `enquiryApp`: Current logged-in user email
- `enquiryAppUserData`: Full user object
- `enquiryApp_categories`: All categories
- `enquiryApp_statuses`: All statuses
- `enquiryApp_enquiries`: All enquiries

## Module Breakdown

### **Login Module**
- Email validation (must be Gmail format)
- Hardcoded credentials: `admin@gmail.com` / `password`
- Uses AuthService for state management
- Redirects to status page after login
- Shows dashboard/logout options when already logged in

### **Category Master**
- Full CRUD operations
- Auto-generated IDs
- Active/Inactive toggle
- Validation: Category name required
- Synchronized across the app via CategoryService

### **Status Master**
- Same structure as Category Master
- Pre-populated with 4 default statuses (New, In Progress, Resolved, Closed)
- Status codes for programmatic reference
- Badge classes for future styling

### **Enquiry System** (Ready to implement)
Models include:
- Customer details (name, email, phone)
- Category and Status references (IDs + names for display)
- Priority levels (Low, Medium, High, Urgent)
- Resolution notes and assignment
- Created/Updated timestamps

## Angular 22 Features Used

1. **Signals**: Reactive state management
2. **@if/@for**: New control flow syntax (no *ngIf/*ngFor)
3. **Standalone components**: No NgModule needed
4. **input()**: New input signal API
5. **inject()**: Functional dependency injection
6. **computed()**: Derived signals
7. **effect()**: Side effects on signal changes

## Key Benefits of This Architecture

### **Centralized State**
- Single source of truth for each data type
- No prop drilling
- Automatic synchronization across components

### **Type Safety**
- Strong TypeScript interfaces
- Compile-time error detection
- Better IDE autocomplete

### **Reactive Patterns**
- UI automatically updates when data changes
- No manual change detection needed
- Cleaner component code

### **Scalability**
- Easy to add new master tables (follow Category/Status pattern)
- Services can be enhanced with API calls later
- Component communication patterns ready for complex features

### **Maintainability**
- Consistent patterns across all modules
- Reusable components
- Separation of concerns (service/component/template)

## Next Steps to Complete the Project

### 1. **New Enquiry Form**
- Form with all fields from IEnquiry model
- Dropdowns populated from CategoryService and StatusService
- Validation rules
- Success notification
- Uses EnquiryService.addEnquiry()

### 2. **Enquiry List**
- Table displaying all enquiries
- Show category name and status name (not just IDs)
- Filters: by category, by status, by priority, by date range
- Search by customer name/email
- Edit/Delete actions
- Status update functionality

### 3. **Dashboard Component** (Optional)
- Summary cards: Total enquiries, New enquiries, Resolved, etc.
- Charts: Enquiries by category, by status, by priority
- Recent enquiries list
- Quick stats

### 4. **Additional Features**
- Export enquiries to CSV/Excel
- Print functionality
- Audit trail (who created/updated)
- Bulk actions (assign multiple enquiries)
- Email notifications (placeholder for now)

## Code Examples

### **Creating a New Master Component**

Follow this pattern for any new master table:

```typescript
// 1. Create interface in model/
export interface IPriority {
  priorityId: number;
  priorityName: string;
  priorityLevel: number;
  colorCode: string;
  isActive: boolean;
}

// 2. Create service
@Injectable({ providedIn: 'root' })
export class PriorityService {
  private readonly STORAGE_KEY = 'enquiryApp_priorities';
  private prioritiesData = signal<IPriority[]>([]);
  
  getPriorities = this.prioritiesData.asReadonly();
  
  addPriority(priority: Omit<IPriority, 'priorityId'>): IPriority {
    // Implementation
  }
  
  updatePriority(priority: IPriority): void { }
  deletePriority(priorityId: number): boolean { }
}

// 3. Create component
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriorityMaster {
  priorityService = inject(PriorityService);
  priorityList = this.priorityService.getPriorities;
  // Rest of the implementation
}
```

### **Using Component Communication**

```typescript
// Parent component
<app-enquiry-form 
  [categories]="categoryList()" 
  [statuses]="statusList()"
  (enquirySubmitted)="onEnquirySubmitted($event)"
/>

// Child component
export class EnquiryForm {
  categories = input.required<ICategory[]>();
  statuses = input.required<IStatus[]>();
  enquirySubmitted = output<IEnquiry>();
  
  onSubmit() {
    this.enquirySubmitted.emit(this.formData);
  }
}
```

## Testing Credentials
- **Email**: admin@gmail.com
- **Password**: password

## Notes
- All UI/CSS remains unchanged
- No external API dependencies
- Data persists in browser localStorage
- Ready for future API integration (just modify service methods)
- Production-ready patterns and architecture
