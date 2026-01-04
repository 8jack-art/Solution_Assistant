-- 更新测试用户密码为 123456 的正确哈希
UPDATE users SET password_hash = '$2b$10$u89OF8bb3F6fhc9CUGOiqeIUhEJUsclPy/n4.XS0Ne9IvttS.Vruu' WHERE username = 'admin';
UPDATE users SET password_hash = '$2b$10$u89OF8bb3F6fhc9CUGOiqeIUhEJUsclPy/n4.XS0Ne9IvttS.Vruu' WHERE username = 'user';