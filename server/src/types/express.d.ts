// Express类型声明
declare global {
  namespace Express {
    interface Request {
      body: any;
      params: any;
      query: any;
      user?: {
        userId: string;
        username: string;
        isAdmin: boolean;
      };
    }
    interface Response {
      status(code: number): Response;
      json<T = any>(body: T): Response;
      send(body?: any): Response;
      end(body?: any): Response;
    }
  }
}

declare module 'console' {
  export function log(message?: any, ...optionalParams: any[]): void;
  export function error(message?: any, ...optionalParams: any[]): void;
  export function warn(message?: any, ...optionalParams: any[]): void;
}

declare module 'pool' {
  export function query(sql: string, params?: any[]): Promise<any>;
}