import { User } from '../types/index.js';
export declare class UserModel {
    static findById(id: string): Promise<User | null>;
    static findByUsername(username: string): Promise<User | null>;
    static create(userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User | null>;
    static update(id: string, updates: Partial<User>): Promise<User | null>;
    static delete(id: string): Promise<boolean>;
    static getAll(): Promise<User[]>;
}
//# sourceMappingURL=User.d.ts.map