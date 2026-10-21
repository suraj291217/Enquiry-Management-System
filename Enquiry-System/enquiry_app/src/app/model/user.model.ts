export interface IUser {
  userId: number;
  email: string;
  name: string;
  phone: string;
  role: 'admin' | 'user';
  loginTime: string | Date;
}
