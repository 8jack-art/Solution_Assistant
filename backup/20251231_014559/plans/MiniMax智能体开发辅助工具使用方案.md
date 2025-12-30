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
- ✅ 安装和配置 Mini-Agent CLI 工具（已完成）
- ✅ 让智能体能够访问项目代码
- ✅ 提供使用指南和最佳实践

## 2. 安装状态

### 2.1 已完成安装
- ✅ Mini-Agent 0.1.0 已安装
- ✅ 配置文件已创建：`~/.mini-agent/config/config.yaml`
- ✅ 启动脚本已创建：`.mini-agent-start.sh`

### 2.2 安装位置
- **安装目录**：`/opt/Solution_Assistant/mini-agent-extract/Mini-Agent-main/`
- **配置文件**：`~/.mini-agent/config/config.yaml`
- **启动脚本**：`.mini-agent-start.sh`

## 3. 使用方法

### 3.1 快速启动（推荐）
```bash
cd /opt/Solution_Assistant
./.mini-agent-start.sh
```

### 3.2 手动启动
```bash
# 设置环境变量
export PATH="/home/clp2001/.local/bin:$PATH"
export MINIMAX_API_KEY="sk-cp-xxxxxxxxxx"
export MINIMAX_API_BASE="https://api.minimaxi.com"
export MINIMAX_MODEL="MiniMax-M2"

# 启动
mini-agent --workspace /opt/Solution_Assistant
```

### 3.3 命令行参数
```bash
mini-agent --version          # 查看版本
mini-agent --help             # 查看帮助
mini-agent --workspace /path  # 指定工作目录
```

## 4. 交互式会话示例

### 示例 1：代码审查
```
用户：请帮我审查 client/src/pages/LLMConfigsManagement.tsx 的代码质量

智能体：
- 读取文件...
- 分析代码结构...
- 发现优化点...
```

### 示例 2：生成测试用例
```
用户：请为 server/src/controllers/llmController.ts 生成单元测试

智能体：
- 分析代码结构...
- 识别需要测试的函数...
- 生成测试文件...
```

### 示例 3：技术方案建议
```
用户：我们需要优化投资估算的计算性能，有什么建议？

智能体：
- 分析现有代码...
- 发现性能瓶颈...
- 提供优化建议...
```

## 5. 常用命令

| 命令 | 说明 |
|------|------|
| `ls` | 列出工作目录文件 |
| `read <file>` | 读取文件内容 |
| `edit <file>` | 编辑文件 |
| `bash <command>` | 执行 Shell 命令 |
| `grep <pattern>` | 搜索文件内容 |
| `test` | 运行项目测试 |

## 6. 配置说明

### 6.1 配置文件位置
`~/.mini-agent/config/config.yaml`

### 6.2 配置内容
```yaml
api_key: "sk-cp-xxxxxxxxxx"           # API Key
api_base: "https://api.minimaxi.com"  # API 地址
model: "MiniMax-M2"                   # 模型
max_steps: 100                        # 最大执行步数
workspace_dir: "/opt/Solution_Assistant"  # 工作目录
```

## 7. 故障排除

### 7.1 常见问题

**问题：命令未找到**
```bash
# 确保 PATH 正确
export PATH="/home/clp2001/.local/bin:$PATH"
```

**问题：API Key 无效**
- 检查配置文件中的 API Key 是否正确
- 从 https://platform.minimaxi.com 重新获取

### 7.2 日志查看
```bash
cat ~/.mini-agent/logs/mini-agent.log
```

## 8. 相关资源

- Mini-Agent GitHub：https://github.com/MiniMax-AI/Mini-Agent
- MiniMax 平台：https://platform.minimaxi.com

## 9. 快速开始清单

- [x] 克隆/解压 Mini-Agent
- [x] pip 安装
- [x] 配置 API Key
- [ ] 启动并使用

## 10. 文件清单

| 文件 | 说明 |
|------|------|
| `mini-agent-extract/Mini-Agent-main/` | Mini-Agent 源码 |
| `.mini-agent-config/config.yaml` | 配置模板 |
| `.mini-agent-start.sh` | 启动脚本 |
| `plans/MiniMax智能体开发辅助工具使用方案.md` | 使用指南 |
