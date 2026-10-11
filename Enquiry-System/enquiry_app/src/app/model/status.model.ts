export interface IStatus {
  statusId: number;
  statusName: string;
  statusCode?: string;
  badgeClass?: string;
  isActive: boolean;
  displayOrder?: number;
  isSystemDefault?: boolean;
  createdDate?: string;
}
