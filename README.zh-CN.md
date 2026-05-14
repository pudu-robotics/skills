# Agent Skills 中文说明

本仓库收录了一组面向 AI 编码助手的技能包，适用于 Claude Code、Gemini CLI、Copilot CLI、Codex 等支持 Skills 机制的 Agent。

英文版说明见 [README.md](./README.md)。

## 仓库地址

中文环境下，建议直接使用 Gitee 仓库：

```text
https://gitee.com/pudu-robotics/skills
```

## 可用技能

### `pudu-openapi-skill`

用于调用普渡机器人云端 OpenAPI，覆盖以下能力：

| 分类 | 说明 |
| --- | --- |
| 机器人状态 | 查询机器人状态、位置、任务状态 |
| 配送与运送 | 下发配送任务、多点运送 |
| 跑腿任务 | 跑腿模式任务管理 |
| 顶升与托盘 | 顶升机器人任务、托盘订单 |
| 巡航任务 | 巡航任务下发、巡航线路查询 |
| 呼叫任务 | 自定义呼叫机器人 |
| 闪电匣 | 舱门状态/控制、舱门拍照任务、电梯内切图 |
| 媒体与内容 | 屏幕展示、语音播报、音量控制 |
| 控制与上报 | 充电、切图、位置上报、交管区上报与查询 |
| 统计分析 | 清洁、通用、配送、行业、大盘简报 |
| 日志与记录 | 自检、充电、故障事件查询 |
| 任务调度 | 呼叫/配送任务执行明细 |
| 门店数据 | 门店列表、机器列表 |
| 地图服务 | 地图、点位、点位组、底图查询 |
| 广告播放与配置 | 广告列表、详情、创建、更新、删除、场景菜单 |
| 货柜任务与货柜 SKU | 商品 SKU 同步、SKU 查询、货柜列表、货柜配送下单 |

前置要求：

- 从 [普渡开放平台](https://open.pudutech.com/zh/cloud-api/gjq71a2i4qzpgk0t2ooe3vi7) 获取 `ApiAppKey` 和 `ApiAppSecret`
- 支持的集群：`cn`、`sea`、`de`、`us`

内置请求脚本：

- JavaScript
- Python
- Go
- Java
- C#

### `pudu-cloudveil-skill`

用于调用 PUDU CloudVeil / 云隐 OpenAPI，覆盖 SSO + SM2 登录、机器人地图、机器人状态、机器人任务、机器人控制、回调说明、调度能力、订单到人和数据看板统计。

适用场景：

- 需要通过 CloudVeil 账号密码完成鉴权并获取 access token
- 需要查询地图、点位、门店、机器人组、机器人状态
- 需要下发呼叫、配送、运送、跑腿、顶升、托盘、领位等任务
- 需要执行切图、回充、位置上报等控制操作
- 需要读取看板、分析报表、任务明细、日志或订单到人相关接口

## 常用安装方式

### 1. 先查看仓库里有哪些技能

```bash
npx skills add https://gitee.com/pudu-robotics/skills.git --list
```

适用场景：

- 第一次接触本仓库
- 想确认技能名是否正确
- 想查看仓库里是否新增了其他技能

### 2. 安装单个技能到当前项目

```bash
npx skills add https://gitee.com/pudu-robotics/skills.git --skill pudu-openapi-skill
```

适用场景：

- 只在当前项目里使用
- 希望技能跟随项目一起管理

安装 `pudu-cloudveil-skill`：

```bash
npx skills add https://gitee.com/pudu-robotics/skills.git --skill pudu-cloudveil-skill
```

### 3. 安装到全局环境

```bash
npx skills add https://gitee.com/pudu-robotics/skills.git --skill pudu-openapi-skill -g
```

适用场景：

- 希望本机所有项目都能使用
- 不想每个仓库重复安装

### 4. 给指定 Agent 安装

```bash
npx skills add https://gitee.com/pudu-robotics/skills.git --skill pudu-openapi-skill -a codex
```

常见 `-a` 取值示例：

- `codex`
- `claude-code`
- `cursor`
- `gemini-cli`

安装 `pudu-cloudveil-skill` 到指定 Agent：

```bash
npx skills add https://gitee.com/pudu-robotics/skills.git --skill pudu-cloudveil-skill -a codex
```

### 5. 非交互安装，适合脚本或 CI

```bash
npx skills add https://gitee.com/pudu-robotics/skills.git --skill pudu-openapi-skill -g -a codex -y
```

其中：

- `-g` 表示全局安装
- `-a codex` 表示只安装到 Codex
- `-y` 表示跳过确认提示

## 参数说明

```bash
npx skills add <source> [options]
```

本仓库常用参数如下：

| 参数 | 说明 |
| --- | --- |
| `<source>` | 技能来源仓库，中文环境下建议使用 `https://gitee.com/pudu-robotics/skills.git` |
| `--list` | 只列出仓库中的技能，不执行安装 |
| `--skill <name>` | 指定要安装的技能名，可重复传多个 |
| `-g, --global` | 安装到用户级目录，而不是当前项目 |
| `-a, --agent <agent>` | 只安装到指定 Agent |
| `-y, --yes` | 跳过交互确认 |

## 推荐命令清单

```bash
# 查看仓库中的技能
npx skills add https://gitee.com/pudu-robotics/skills.git --list

# 安装到当前项目
npx skills add https://gitee.com/pudu-robotics/skills.git --skill pudu-openapi-skill

# 安装 pudu-cloudveil-skill 到当前项目
npx skills add https://gitee.com/pudu-robotics/skills.git --skill pudu-cloudveil-skill

# 安装到全局
npx skills add https://gitee.com/pudu-robotics/skills.git --skill pudu-openapi-skill -g

# 安装到指定 Agent
npx skills add https://gitee.com/pudu-robotics/skills.git --skill pudu-openapi-skill -a codex

# 安装 pudu-cloudveil-skill 到指定 Agent
npx skills add https://gitee.com/pudu-robotics/skills.git --skill pudu-cloudveil-skill -a codex

# 非交互安装
npx skills add https://gitee.com/pudu-robotics/skills.git --skill pudu-openapi-skill -g -a codex -y
```

## 技能目录结构

```text
skills/<skill-name>/
├── SKILL.md
├── assets/
├── references/
└── scripts/
```

说明：

- `SKILL.md`：技能定义、触发条件、执行流程
- `assets/`：OpenAPI 规范或静态资源
- `references/`：补充说明、能力清单、SDK 参考
- `scripts/`：辅助执行脚本

## 常见问题

### 为什么不建议直接写 `pudu-robotics/skills`

因为这是 GitHub 风格的仓库简写。中文环境下本仓库托管在 Gitee，直接写简写可能会让 CLI 按 GitHub 来源处理。最稳妥的方式是显式传完整 Gitee URL。

### 为什么要用 `--skill`

因为一个仓库里可以包含多个技能。`--skill` 用来明确指定要安装哪一个技能；如果只传仓库地址，通常需要再交互选择，或者先用 `--list` 查看。

### 什么时候用 `-g`

当你希望技能在本机全局可用，而不是仅在当前项目里生效时，用 `-g`。

## 贡献

1. 在 `skills/<your-skill-name>/` 下创建新技能目录
2. 补充清晰的 `SKILL.md`
3. 根据需要添加 `assets/`、`references/`、`scripts/`
4. 提交 Pull Request
