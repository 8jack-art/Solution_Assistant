import { verifyToken } from '../utils/jwt.js';
export function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ success: false, error: '访问令牌缺失' });
    }
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(403).json({ success: false, error: '访问令牌无效' });
    }
    req.user = {
        userId: payload.userId,
        username: payload.username,
        isAdmin: payload.isAdmin
    };
    next();
}
export function requireAdmin(req, res, next) {
    if (!req.user?.isAdmin) {
        return res.status(403).json({ success: false, error: '需要管理员权限' });
    }
    next();
}
//# sourceMappingURL=auth.js.map