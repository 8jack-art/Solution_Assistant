#!/usr/bin/env python3
"""
智谱AI连接测试脚本
"""
import sys
import json
from zhipuai import ZhipuAI

def test_connection(api_key, model):
    """测试智谱AI连接"""
    try:
        client = ZhipuAI(api_key=api_key)
        
        response = client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "你是一个有用的AI助手。"
                },
                {
                    "role": "user",
                    "content": "你好，这是一个连接测试。"
                }
            ],
            temperature=0.1,
            max_tokens=10
        )
        
        # 解析响应
        if response and hasattr(response, 'choices') and len(response.choices) > 0:
            content = response.choices[0].message.content
            result = {
                "success": True,
                "content": content
            }
            print(json.dumps(result, ensure_ascii=False))
            return True
        else:
            result = {
                "success": False,
                "error": "响应格式无效"
            }
            print(json.dumps(result, ensure_ascii=False))
            return False
            
    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(result, ensure_ascii=False))
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        result = {
            "success": False,
            "error": "参数不足，需要提供api_key和model"
        }
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(1)
    
    api_key = sys.argv[1]
    model = sys.argv[2]
    
    test_connection(api_key, model)
