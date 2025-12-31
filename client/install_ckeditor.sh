#!/bin/bash
echo "正在安装CKEditor5依赖包..."
cd /opt/Solution_Assistant/client

# 清理node_modules
rm -rf node_modules package-lock.json

# 安装依赖
npm install

echo "依赖安装完成"