# 项目架构说明

## 1. 项目概述

这是一个投资项目管理系统，采用前后端分离架构，主要功能包括项目管理、投资估算、收入成本建模、LLM配置管理等。系统使用React作为前端框架，Express作为后端框架，MySQL作为数据库。

## 2. 技术栈

### 前端技术栈
- **框架**: React 18 + TypeScript
- **UI库**: Mantine UI + Tailwind CSS
- **状态管理**: Zustand
- **路由**: React Router DOM
- **HTTP客户端**: Axios
- **构建工具**: Vite
- **图标库**: Tabler Icons React

### 后端技术栈
- **运行时**: Node.js + TypeScript
- **框架**: Express.js
- **数据库**: MySQL 2
- **安全**: Helmet, CORS, rate limiting
- **验证**: Zod
- **认证**: JSON Web Token (JWT)

### 数据库
- **数据库**: MySQL
- **连接池**: mysql2

## 3. 项目结构

### 前端结构 (client/)
```
client/
├── src/
│   ├── components/          # 可复用组件
│   ├── hooks/              # 自定义Hook
│   ├── lib/                # 工具函数和API接口
│   ├── pages/              # 页面组件
│   ├── routes/             # 路由配置
│   ├── services/           # 服务层
│   ├── stores/             # Zustand状态管理
│   ├── styles/             # 样式文件
│   ├── types/              # TypeScript类型定义
│   ├── App.tsx             # 应用根组件
│   ├── main.tsx            # 应用入口
│   └── theme.ts            # Mantine主题配置
├── package.json            # 前端依赖配置
├── tsconfig.json           # TypeScript配置
├── vite.config.ts          # Vite构建配置
└── tailwind.config.js      # Tailwind配置
```

### 后端结构 (server/)
```
server/
├── src/
│   ├── controllers/        # 控制器层，处理请求逻辑
│   ├── db/                 # 数据库配置和初始化
│   ├── lib/                # 工具函数
│   ├── middleware/         # 中间件（认证、日志等）
│   ├── models/             # 数据模型
│   ├── routes/             # API路由定义
│   ├── scripts/            # 脚本文件
│   ├── server.ts           # 服务器启动文件
│   ├── types/              # TypeScript类型定义
│   └── utils/              # 通用工具函数
├── package.json            # 后端依赖配置
├── tsconfig.json           # TypeScript配置
└── migrate_loan_fields_mysql.ts # 数据库迁移脚本
```

## 4. 数据库设计

### 用户表 (users)
- id: VARCHAR(36) - 主键，UUID
- username: VARCHAR(50) - 用户名（唯一）
- password_hash: VARCHAR(255) - 密码哈希
- is_admin: BOOLEAN - 是否管理员
- is_expired: BOOLEAN - 是否过期
- expired_at: TIMESTAMP - 过期时间
- created_at: TIMESTAMP - 创建时间
- updated_at: TIMESTAMP - 更新时间

### 投资项目表 (investment_projects)
- id: VARCHAR(36) - 主键，UUID
- user_id: VARCHAR(36) - 外键，关联用户
- project_name: VARCHAR(255) - 项目名称
- total_investment: DECIMAL(15,2) - 总投资
- project_info: TEXT - 项目信息
- status: ENUM - 状态（draft, completed）
- construction_years: INT - 建设期年数
- operation_years: INT - 运营期年数
- loan_ratio: DECIMAL(5,4) - 贷款比例
- loan_interest_rate: DECIMAL(8,6) - 贷款利率
- 土地相关字段（land_*）- 用地信息
- is_locked: BOOLEAN - 是否锁定
- locked_at: TIMESTAMP - 锁定时间
- created_at: TIMESTAMP - 创建时间
- updated_at: TIMESTAMP - 更新时间

## 5. API接口设计

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

### 项目管理接口
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `GET /api/projects/:id` - 获取项目详情
- `PUT /api/projects/:id` - 更新项目
- `DELETE /api/projects/:id` - 删除项目
- `POST /api/projects/:id/lock` - 锁定项目
- `POST /api/projects/:id/unlock` - 解锁项目

### 投资估算接口
- `POST /api/investment/calculate` - 计算投资估算
- `POST /api/investment/save` - 保存投资估算
- `GET /api/investment/project/:projectId` - 获取项目估算
- `POST /api/investment/generate/:projectId` - 生成摘要

### LLM配置接口
- `GET /api/llm` - 获取配置列表
- `POST /api/llm/create` - 创建配置
- `PUT /api/llm/:id` - 更新配置
- `DELETE /api/llm/:id` - 删除配置
- `POST /api/llm/test-connection` - 测试连接

### 营收成本接口
- `GET /api/revenue-cost/project/:projectId` - 获取营收成本数据
- `POST /api/revenue-cost/save` - 保存营收成本数据
- `POST /api/revenue-cost/ai-suggest` - AI建议营收结构

## 6. 核心功能模块

### 6.1 用户认证模块
- 基于JWT的用户认证
- 管理员和普通用户权限区分
- 密码加密存储（bcrypt）

### 6.2 项目管理模块
- 项目创建、编辑、删除
- 项目锁定/解锁功能
- 项目信息存储（建设期、运营期、贷款信息等）

### 6.3 投资估算模块
- 建筑工程费、设备购置费、安装工程费等分类估算
- 基本预备费、价差预备费计算
- 贷款金额和利率计算

### 6.4 营收成本建模模块
- 收入结构设计和建模
- 成本结构设计和建模
- 现金流量表生成
- 财务指标计算
- AI辅助营收结构建议

### 6.5 LLM集成模块
- 多种LLM提供商支持
- API密钥管理
- 模型配置和连接测试

## 7. 安全措施

- **认证授权**: 使用JWT进行用户身份验证
- **输入验证**: 使用Zod进行请求数据验证
- **SQL注入防护**: 使用参数化查询
- **XSS防护**: 使用Helmet中间件
- **速率限制**: 防止API滥用
- **CORS配置**: 控制跨域请求

## 8. 部署配置

### 环境变量
- `PORT` - 服务端口（默认3001）
- `CORS_ORIGIN` - 允许的前端域名
- `DB_HOST` - 数据库主机
- `DB_PORT` - 数据库端口
- `DB_USER` - 数据库用户名
- `DB_PASSWORD` - 数据库密码
- `DB_NAME` - 数据库名
- `JWT_SECRET` - JWT密钥

### 启动脚本
- `npm run dev` - 开发模式启动（前后端同时启动）
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务

## 9. 状态管理

前端使用Zustand进行状态管理，主要包含：
- 用户认证状态
- 项目数据状态
- 营收成本建模状态

## 10. 数据流

1. 用户通过前端界面发起请求
2. 前端通过Axios调用后端API
3. 后端中间件进行认证和验证
4. 控制器调用模型层进行数据操作
5. 模型层与数据库交互
6. 返回结果给前端
7. 前端更新UI状态

## 11. 测试账号

系统提供两个测试账号：
- **管理员账号**
  - 用户名：admin
  - 密码：123456
  - 权限：可查看所有项目
- **普通用户账号**
  - 用户名：user
  - 密码：123456
  - 权限：只能查看自己的项目