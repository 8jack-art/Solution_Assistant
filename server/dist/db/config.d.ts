import mysql from 'mysql2/promise';
export declare const dbConfig: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    waitForConnections: boolean;
    connectionLimit: number;
    queueLimit: number;
    enableKeepAlive: boolean;
    keepAliveInitialDelay: number;
    connectTimeout: number;
    acquireTimeout: number;
    timeout: number;
};
export declare const pool: mysql.Pool;
export declare function testConnection(): Promise<boolean>;
//# sourceMappingURL=config.d.ts.map