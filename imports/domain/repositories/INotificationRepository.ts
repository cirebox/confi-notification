export interface INotificationRepository {
  create(userId: string, message: string): Promise<string>;
  findById(id: string): Promise<any>;
  markAsRead(id: string): Promise<number>;
  softDelete(id: string): Promise<number>;
  findByUserId(userId: string, skip: number, limit: number): any;
  countByUserId(userId: string): number;
}
