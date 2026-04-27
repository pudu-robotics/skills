# -*- coding: utf-8 -*-
"""
Pudu OpenAPI 请求工具

能力：
- 支持 GET / POST 的 HMAC-SHA1 签名请求
- 自动解析环境变量中的凭证和集群
- 统一返回解析后的结果，便于上层直接判断成功或失败

默认读取以下环境变量：
- PUDU_API_APP_KEY
- PUDU_API_APP_SECRET
- PUDU_API_CLUSTER（cn / sea / de / us）
"""

import os
import base64
import datetime
import hashlib
import hmac
import json
import re
from urllib.parse import quote, unquote
import requests

CLUSTERS = {
    "cn": {
        "name": "国内生产节点",
        "hostname": "open-platform.pudutech.com",
    },
    "sea": {
        "name": "海外（日韩新加坡）生产节点",
        "hostname": "css-open-platform.pudutech.com",
    },
    "de": {
        "name": "德国生产节点",
        "hostname": "csg-open-platform.pudutech.com",
    },
    "us": {
        "name": "美国生产节点",
        "hostname": "csu-open-platform.pudutech.com",
    },
}

# ─── 通用工具 ─────────────────────────────────────────────────────────────────

def mask_secret(value: str) -> str:
    """对敏感值做脱敏展示，避免日志或报错中回显完整凭证"""
    if not value:
        return ""
    if len(value) <= 6:
        return f"{value[:1]}***"
    return f"{value[:3]}***{value[-3:]}"

def is_mac_address(value) -> bool:
    """判断字符串是否是常见 MAC 地址格式，例如：14:80:CC:89:27:A6"""
    if not isinstance(value, str):
        return False
    return bool(re.match(r"^[0-9A-Fa-f]{2}(:[0-9A-Fa-f]{2}){5}$", value))

def validate_sn_field(params):
    """当接口需要 sn 时，防止误把 MAC 地址当作 sn 传入。"""
    if not isinstance(params, dict):
        return
    sn = params.get("sn")
    if is_mac_address(sn):
        raise ValueError(
            f"检测到 sn 的值看起来像 MAC 地址（{sn}）。请提供机器人 SN，而不是 MAC 地址。"
        )

def resolve_credentials(api_app_key=None, api_app_secret=None):
    """从环境变量和显式参数中解析凭证。显式参数优先，其次读取环境变量。"""
    resolved_key = api_app_key or os.environ.get("PUDU_API_APP_KEY")
    resolved_secret = api_app_secret or os.environ.get("PUDU_API_APP_SECRET")
    
    if not resolved_key:
        raise ValueError("ApiAppKey 缺失。请直接提供 api_app_key，或设置环境变量 PUDU_API_APP_KEY。")
    if not resolved_secret:
        raise ValueError("ApiAppSecret 缺失。请直接提供 api_app_secret，或设置环境变量 PUDU_API_APP_SECRET。")
        
    return resolved_key, resolved_secret

def resolve_cluster(hostname=None, cluster=None):
    """
    解析集群信息。
    - 优先使用显式传入的 hostname
    - 否则使用 cluster 或环境变量 PUDU_API_CLUSTER 映射 hostname
    """
    if hostname:
        cluster_name = CLUSTERS.get(cluster, {}).get("name", "自定义集群") if cluster else "自定义集群"
        return {
            "cluster": cluster or "custom",
            "clusterName": cluster_name,
            "hostname": hostname
        }
        
    cluster_key = cluster or os.environ.get("PUDU_API_CLUSTER")
    if not cluster_key:
        raise ValueError("PUDU_API_CLUSTER 缺失。请设置环境变量 PUDU_API_CLUSTER，或显式传入 cluster/hostname。")
        
    cluster_config = CLUSTERS.get(cluster_key)
    if not cluster_config:
        raise ValueError(f"无效的集群值：{cluster_key}。可选值仅支持 cn / sea / de / us。")
        
    return {
        "cluster": cluster_key,
        "clusterName": cluster_config["name"],
        "hostname": cluster_config["hostname"]
    }

# ─── 签名工具 ─────────────────────────────────────────────────────────────────

def compute_content_md5(body_str: str) -> str:
    """计算请求体的 Content-MD5（POST 专用）。规则：MD5(bodyStr) → hex → base64"""
    if not body_str:
        return ""
    md5_hex = hashlib.md5(body_str.encode("utf-8")).hexdigest()
    return base64.b64encode(md5_hex.encode("utf-8")).decode("utf-8")

def build_query_string(params: dict) -> str:
    """将参数对象按字典序拼接为 query string（GET 专用）"""
    parts = []
    for key in sorted(params.keys()):
        value = params[key]
        if isinstance(value, list):
            if value:
                encoded_values = [quote(str(v), safe='') for v in value]
                parts.append(f"{key}={','.join(encoded_values)}")
            else:
                parts.append(str(key))
        elif value is None or value == "":
            parts.append(str(key))
        else:
            parts.append(f"{key}={quote(str(value), safe='')}")
    return "&".join(parts)

def build_signing_string(method: str, sign_path: str, date_time: str, content_md5: str) -> str:
    """构造 HMAC 签名字符串"""
    return f"x-date: {date_time}\n{method}\napplication/json\napplication/json\n{content_md5}\n{sign_path}"

# ─── 核心请求方法 ──────────────────────────────────────────────────────────────

def request(
    path: str,
    method: str,
    params=None,
    hostname=None,
    cluster=None,
    api_app_key=None,
    api_app_secret=None,
    port=443,
    timeout_ms=15000
):
    """
    发起已签名的 HTTPS 请求（GET / POST）
    
    :param path: 接口路径（以 / 开头）
    :param method: 请求方法，"GET" 或 "POST"
    :param params: GET 查询参数 或 POST 请求体字段
    :param hostname: 请求 host（不含协议，例如 open-platform.pudutech.com）
    :param cluster: 集群标识（cn / sea / de / us），未传时读取 PUDU_API_CLUSTER
    :param api_app_key: 应用 ApiAppKey，未传时读取 PUDU_API_APP_KEY
    :param api_app_secret: 应用 ApiAppSecret，未传时读取 PUDU_API_APP_SECRET
    :param port: 端口号（HTTPS 默认 443）
    :param timeout_ms: 请求超时时间(毫秒)
    :return: 包含响应信息的字典
    """
    if params is None:
        params = {}
        
    if not path or not path.startswith("/"):
        raise ValueError("path 缺失或格式错误。请传入以 / 开头的接口路径。")
        
    normalized_method = method.upper()
    if normalized_method not in ["GET", "POST"]:
        raise ValueError(f"不支持的请求方法：{method}。当前仅支持 GET / POST。")
        
    api_key, api_secret = resolve_credentials(api_app_key, api_app_secret)
    cluster_info = resolve_cluster(hostname, cluster)
    is_get = normalized_method == "GET"
    
    validate_sn_field(params)
    
    # GET：参数进 query string；POST：参数序列化为 JSON body
    query_str = build_query_string(params) if is_get else ""
    body_str = "" if is_get else json.dumps(params, separators=(',', ':'), ensure_ascii=False)
    md5 = "" if is_get else compute_content_md5(body_str)
    
    # 请求路径（GET 附带 encoded query string）
    full_path = f"{path}?{query_str}" if query_str else path
    
    # 签名路径：剔除环境信息 (例如 /release, /test, /prepub)
    sign_path_base = path
    if sign_path_base.startswith(("/release", "/test", "/prepub")):
        parts = sign_path_base[1:].split("/", 1)
        if len(parts) > 1:
            sign_path_base = "/" + parts[1]
        else:
            sign_path_base = "/"
    sign_path_base = sign_path_base if sign_path_base else "/"
    
    # 签名路径：GET 使用 decoded query string，避免二次编码导致签名不匹配
    sign_path = f"{sign_path_base}?{unquote(query_str)}" if query_str else sign_path_base
    
    # 构造时间
    date_time = datetime.datetime.utcnow().strftime("%a, %d %b %Y %H:%M:%S GMT")
    
    # 构造签名
    signing_str = build_signing_string(normalized_method, sign_path, date_time, md5)
    signature = hmac.new(api_secret.encode("utf-8"), msg=signing_str.encode("utf-8"), digestmod=hashlib.sha1).digest()
    signature_b64 = base64.b64encode(signature).decode("utf-8")
    authorization = f'hmac id="{api_key}", algorithm="hmac-sha1", headers="x-date", signature="{signature_b64}"'
    
    url = f"https://{cluster_info['hostname']}:{port}{full_path}"
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Content-MD5": md5,
        "x-date": date_time,
        "Authorization": authorization
    }
    
    try:
        if is_get:
            res = requests.get(url, headers=headers, timeout=timeout_ms / 1000.0)
        else:
            res = requests.post(url, headers=headers, data=body_str.encode("utf-8"), timeout=timeout_ms / 1000.0)
            
        status_code = res.status_code
        try:
            res_json = res.json()
        except ValueError:
            res_json = None
            
        message = res_json.get("message", "") if isinstance(res_json, dict) else ""
        ok = status_code == 200 and message == "SUCCESS"
        
        error_message = ""
        if not ok:
            if isinstance(res_json, dict):
                error_message = res_json.get("message") or res_json.get("error") or res_json.get("msg") or ""
            if not error_message:
                error_message = res.text or f"HTTP {status_code} 请求失败"
                
        return {
            "ok": ok,
            "status": status_code,
            "message": message,
            "cluster": cluster_info["cluster"],
            "clusterName": cluster_info["clusterName"],
            "hostname": cluster_info["hostname"],
            "method": normalized_method,
            "path": full_path,
            "json": res_json,
            "body": res.text,
            "traceId": res_json.get("trace_id", "") if isinstance(res_json, dict) else "",
            "errorMessage": error_message
        }
    except Exception as e:
        return {
            "ok": False,
            "status": 0,
            "message": str(e),
            "cluster": cluster_info["cluster"] if 'cluster_info' in locals() else "",
            "clusterName": cluster_info["clusterName"] if 'cluster_info' in locals() else "",
            "hostname": cluster_info["hostname"] if 'cluster_info' in locals() else "",
            "method": normalized_method if 'normalized_method' in locals() else method,
            "path": full_path if 'full_path' in locals() else path,
            "json": None,
            "body": "",
            "traceId": "",
            "errorMessage": str(e)
        }

# ─── 示例用法（直接执行时运行）────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        api_key, api_secret = resolve_credentials()
        cluster_info = resolve_cluster()
        
        print("当前配置：")
        print(f"- ApiAppKey: {mask_secret(api_key)}")
        print(f"- ApiAppSecret: {mask_secret(api_secret)}")
        print(f"- 集群: {cluster_info['clusterName']} ({cluster_info['hostname']})")
        print("")
        print("请在其他脚本中按需调用 request()，避免直接执行本文件时误发真实请求。")
    except ValueError as e:
        print(f"配置检查失败：{str(e)}")
