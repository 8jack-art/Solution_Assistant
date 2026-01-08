#!/bin/bash
# MiniMax Agent 启动脚本

# 设置 PATH
export PATH="/home/clp2001/.local/bin:$PATH"

# 设置 MiniMax API 配置
export MINIMAX_API_KEY="sk-cp-OfN7NNx7bjKIVvx3ybaR6ayKFu7cTSZ5fKRWEDEkmMxo3DJlRpnAaHReg_oHftkKwh7Q0H94Bry21pkx8kfNLPW_XnqkwFvq2ykHbYZhvUWlXOFz0jWvDd0"
export MINIMAX_API_BASE="https://api.minimaxi.com"
export MINIMAX_MODEL="MiniMax-M2"

# 启动 mini-agent
echo "启动 MiniMax 智能体..."
echo "工作目录: /opt/Solution_Assistant"
echo ""
mini-agent --workspace /opt/Solution_Assistant
