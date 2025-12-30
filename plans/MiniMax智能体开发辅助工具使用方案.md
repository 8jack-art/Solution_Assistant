# MiniMax 智能体开发辅助工具使用方案

## 1. 需求澄清

### 1.1 用户需求
使用 MiniMax 智能体作为**外部开发辅助工具**，帮助用户：
- 代码审查与优化提示
- 自动化测试用例生成
- 技术方案建议

### 1.2 不需要做的
- ❌ 不需要修改现有项目代码
- ❌ 不需要添加新的 LLM 服务商
- ❌ 不需要改动前后端配置

### 1.3 需要做的
- ✅ 安装和配置 Mini-Agent CLI 工具
- ✅ 让智能体能够访问项目代码
- ✅ 提供使用指南和最佳实践

## 2. Mini-Agent 简介

**Mini-Agent** 是一个独立的智能体工具，通过 CLI 运行，可以：
- 读写项目文件
- 执行 Shell 命令
- 使用 Claude Skills（文档生成、设计、测试等）
- 通过 MCP 访问外部工具（知识图谱、Web 搜索等）

### 2.1 核心特性
| 功能 | 说明 |
|------|------|
| 文件操作 | 读取、编辑、创建项目文件 |
| Shell 执行 | 运行命令、安装依赖、运行测试 |
| 代码分析 | 理解项目结构、分析代码质量 |
| 智能建议 | 基于上下文提供优化建议 |
| 持久记忆 | 跨会话记住关键信息 |

## 3. 安装与配置

### 3.1 系统要求
- Python 3.10+ 或 uv 包管理器
- 操作系统：macOS / Linux / Windows WSL

### 3.2 安装步骤

#### 步骤 1：安装 uv（推荐）
```bash
# macOS/Linux/WSL
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
python -m pip install --user pipx
python -m pipx ensurepath
```

#### 步骤 2：安装 Mini-Agent
```bash
# 从 GitHub 安装
uv tool install git+https://github.com/MiniMax-AI/Mini-Agent.git
```

#### 步骤 3：运行配置脚本
```bash
# macOS/Linux
curl -fsSL https://raw.githubusercontent.com/MiniMax-AI/Mini-Agent/main/scripts/setup-config.sh | bash

# Windows (PowerShell)
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/MiniMax-AI/Mini-Agent/main/scripts/setup-config.ps1" -OutFile "$env:TEMP\setup-config.ps1"
powershell -ExecutionPolicy Bypass -File "$env:TEMP\setup-config.ps1"
```

#### 步骤 4：配置 API Key
编辑配置文件：
```bash
nano ~/.mini-agent/config/config.yaml
```

填写配置：
```yaml
api_key: "YOUR_MINIMAX_API_KEY"      # 从 platform.minimaxi.com 获取
api_base: "https://api.minimaxi.com"  # 中国平台
# api_base: "https://api.minimax.io"  # 全球平台
model: "MiniMax-M2"
max_steps: 100
workspace_dir: "/opt/Solution_Assistant"  # 设置为项目目录
```

## 4. 使用方法

### 4.1 基本用法
```bash
# 使用当前目录作为工作空间
mini-agent

# 指定工作目录
mini-agent --workspace /path/to/your/project

# 检查版本
mini-agent --version
```

### 4.2 交互式会话示例

#### 示例 1：代码审查
```
用户：请帮我审查 client/src/pages/LLMConfigsManagement.tsx 的代码质量

智能体：
- 读取文件...
- 分析代码结构...
- 发现以下优化点：
  1. 第  行有未使用的导入
  2. handleProviderChange 函数可以进一步简化
  3. 建议将 validateField 函数移到组件外部以减少重复创建
...
```

#### 示例 2：生成测试用例
```
用户：请为 server/src/controllers/llmController.ts 生成单元测试

智能体：
- 分析代码结构...
- 识别需要测试的函数：
  - create
  - update
  - delete
  - testConnection
  ...
- 生成测试文件：tests/test_llm_controller.py
```

#### 示例 3：技术方案建议
```
用户：我们需要优化投资估算的计算性能，有什么建议？

智能体：
- 分析现有代码...
- 发现性能瓶颈：
  1. partCalculation.ts 中有重复计算
  2. 建议使用 useMemo 缓存中间结果
  3. 可以考虑将部分计算移至后端
...
```

### 4.3 常用命令

| 命令 | 说明 |
|------|------|
| `ls` | 列出工作目录文件 |
| `read <file>` | 读取文件内容 |
| `edit <file>` | 编辑文件 |
| `bash <command>` | 执行 Shell 命令 |
| `grep <pattern>` | 搜索文件内容 |
| `test` | 运行项目测试 |

## 5. 工作流程设计

### 5.1 日常开发辅助

```
┌─────────────────────────────────────────────────────────────┐
│                    开发工作流程                              │
│                                                             │
│  1. 遇到问题 → 启动 mini-agent 咨询                         │
│       ↓                                                     │
│  2. 代码审查 → 发现潜在问题                                  │
│       ↓                                                     │
│  3. 优化建议 → 实施改进                                      │
│       ↓                                                     │
│  4. 测试生成 → 验证功能                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 推荐使用场景

| 场景 | 示例提示词 |
|------|-----------|
| 代码审查 | "请审查 src/pages/Dashboard.tsx 的代码质量和潜在问题" |
| 重构建议 | "这段代码如何优化？请提供重构建议" |
| Bug 定位 | "请帮我分析这个错误：..." |
| 测试生成 | "请为 server/src/lib/algorithms/partCalculation.ts 生成 Jest 测试" |
| 文档编写 | "请为这个模块生成 API 文档" |
| 性能优化 | "如何优化这个组件的渲染性能？" |

## 6. 高级配置

### 6.1 使用 Claude Skills（可选）
```bash
# 初始化 Claude Skills 子模块
git submodule update --init --recursive
```

### 6.2 MCP 工具集成（可选）
配置 MCP 服务器以支持更多功能：
- 知识图谱访问
- Web 搜索
- 数据库查询

编辑 `~/.mini-agent/config/mcp.json` 进行配置。

## 7. 故障排除

### 7.1 常见问题

**问题 1：API Key 无效**
```bash
# 检查配置文件
cat ~/.mini-agent/config/config.yaml

# 重新生成 API Key
# 访问 https://platform.minimaxi.com/account/api-keys
```

**问题 2：权限错误**
```bash
# 确保工作目录有读写权限
chmod -R 755 /path/to/workspace
```

**问题 3：模块未找到**
```bash
# 确保在项目目录下运行
cd Mini-Agent
uv run python -m mini_agent.cli
```

### 7.2 日志查看
```bash
# 查看详细日志
cat ~/.mini-agent/logs/mini-agent.log
```

## 8. 最佳实践

### 8.1 会话管理
- 每次新任务开始新会话
- 重要结论记录在笔记中
- 复杂问题分步骤解决

### 8.2 安全提示
- ❌ 不要在会话中输入敏感信息
- ❌ 不要让智能体直接修改生产代码
- ✅ 重要修改先备份
- ✅ 审查所有建议后再实施

### 8.3 效率技巧
- 提供清晰的上下文信息
- 明确指定需要分析的文件范围
- 大型项目分区域审查

## 9. 相关资源

- Mini-Agent GitHub：https://github.com/MiniMax-AI/Mini-Agent
- MiniMax 平台：https://platform.minimaxi.com
- 使用文档：[README.md](mini_agent/config/system_prompt.md)

## 10. 快速开始清单

- [ ] 安装 uv 包管理器
- [ ] 安装 mini-agent 工具
- [ ] 获取 MiniMax API Key
- [ ] 配置 config.yaml
- [ ] 测试基本连接
- [ ] 尝试第一次代码审查
- [ ] 生成第一个测试文件
