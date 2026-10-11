export interface IEnquiry {
  enquiryId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  categoryId: number;
  categoryName?: string;
  statusId: number;
  statusName?: string;
  enquiryType: string;
  enquiryDetails: string;
  resolutionNotes?: string;
  assignedTo?: string;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent';
  isDeleted?: boolean;
  createdDate: string;
  updatedDate?: string;
}

export type ICustomerEnquiryStatus = Pick<
  IEnquiry,
  'enquiryId' | 'categoryId' | 'statusId' | 'enquiryType' | 'createdDate' | 'updatedDate' | 'resolutionNotes'
>;
