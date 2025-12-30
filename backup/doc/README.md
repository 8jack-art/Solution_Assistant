# miaoda-react-admin

基于 React 18 + TypeScript + Node.js 的投资项目管理系统，使用 MariaDB 数据库。

## 技术栈

### 前端
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Radix UI
- React Router
- Axios

### 后端
- Node.js + TypeScript
- Express
- MySQL2 (MariaDB 连接)
- JWT 认证
- Zod 数据验证

### 数据库
- MariaDB

## 快速开始

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装依赖
```bash
npm run install:all
```

### 配置环境变量
后端配置文件位于 `server/.env`：
```env
# MariaDB 数据库配置
DB_HOST=sql.gxch.site
DB_PORT=3306
DB_NAME=ProjInvDB
DB_USER=ProjInvDB
DB_PASSWORD=8Pd6tTKmkzY6rYSC

# 服务器配置
PORT=3001
NODE_ENV=development

# JWT 密钥
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS 配置
CORS_ORIGIN=http://localhost:5173
```

### 运行开发服务器
```bash
npm run dev
```

这将同时启动前端开发服务器（端口 5173）和后端 API 服务器（端口 3001）。

### 构建生产版本
```bash
npm run build
```

## 功能特性

### 用户认证
- 多重验证机制
- JWT 令牌认证
- 角色权限控制（管理员/普通用户）
- 测试账号快速登录

### 投资项目管理
- 项目创建、编辑、删除
- 项目状态管理（草稿/完成）
- 项目锁定功能
- 投资参数配置

### 投资估算
- 统一循环迭代算法
- 自动计算建设期利息
- 自定义贷款金额支持
- AI 辅助生成费用项

### LLM 配置管理
- 多供应商支持
- 连接测试功能
- 默认配置设置
- API 密钥安全存储

## API 接口

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/auth/me` - 获取当前用户
- `GET /api/auth/test-users` - 获取测试账号

### 项目管理接口
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取项目详情
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目

### 投资估算接口
- `POST /api/investment/calculate` - 计算投资估算
- `POST /api/investment/save` - 保存投资估算
- `GET /api/investment/project/:projectId` - 获取项目估算

### LLM 配置接口
- `GET /api/llm` - 获取配置列表
- `POST /api/llm/create` - 创建配置
- `PUT /api/llm/:id` - 更新配置
- `DELETE /api/llm/:id` - 删除配置
- `POST /api/llm/test-connection` - 测试连接

## 数据库表结构

### 用户表 (users)
- id, username, password_hash, is_admin, is_expired, created_at, updated_at

### 投资项目表 (investment_projects)
- id, user_id, project_name, total_investment, status, construction_years, operation_years, loan_ratio, loan_interest_rate, is_locked, created_at, updated_at

### 投资估算表 (investment_estimates)
- id, project_id, construction_cost, equipment_cost, installation_cost, other_cost, land_cost, basic_reserve, price_reserve, construction_period, iteration_count, final_total, loan_amount, loan_rate, created_at, updated_at

### LLM 配置表 (llm_configs)
- id, user_id, name, provider, api_key, base_url, model, is_default, created_at, updated_at

## 测试账号

系统提供两个测试账号：

1. **管理员账号**
   - 用户名：admin
   - 密码：123456
   - 权限：可查看所有项目

2. **普通用户账号**
   - 用户名：user
   - 密码：123456
   - 权限：只能查看自己的项目

## 部署说明

### 前端部署
前端构建后的静态文件可以部署到任何静态文件服务器。

### 后端部署
1. 设置生产环境变量
2. 安装依赖：`npm install`
3. 构建：`npm run build`
4. 启动：`npm start`

### 数据库配置
确保 MariaDB 数据库已创建，并且连接信息正确配置在环境变量中。

## 开发规范

- 使用 TypeScript 开发
- 遵循 ESLint 规则
- API 接口统一使用 `ApiResponse` 格式
- 前端组件使用 PascalCase 命名
- 后端路由使用小写和连字符

## 许可证

MIT License