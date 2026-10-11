export interface IUser {
  userId: number;
  email: string;
  role: 'admin' | 'user';
  loginTime: Date;
}
