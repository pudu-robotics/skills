# Agent Skills

[中文说明](./README.zh-CN.md)

A collection of agent skills for AI coding assistants (Claude Code, Gemini CLI, Copilot CLI, etc.).

## Available Skills

### pudu-openapi-skill

Call [Pudu Robotics](https://open.pudutech.com/) cloud OpenAPI to manage robots — task dispatching, status queries, delivery, cruising, calling, and statistical data analysis.

**Capabilities:**

| Category | Description |
|----------|-------------|
| Robot Status | Query robot status, position, task state |
| Delivery & Transport | Dispatch delivery tasks, multi-point transport |
| Errand Tasks | Errand-mode task management |
| Lifting & Tray | Lifting robot tasks, tray orders |
| Cruise Tasks | Patrol task dispatch and cruise route queries |
| Call Tasks | Custom robot calling |
| Flash Cabinet | Compartment state/control, door photo tasks, elevator map switching |
| Media & Content | Screen display, voice broadcast, volume |
| Control & Reporting | Charging, map switching, position reporting, traffic control zone management |
| Clean Analytics | Cleaning mode charts and paginated data |
| Common Analytics | Machine overview, store overview, operation analysis |
| Delivery Analytics | Delivery, call, cruise mode detail and chart data |
| Industry Analytics | Lifting and industry task statistics |
| Brief Dashboard | Store and machine core operation dashboard data |
| Logs & Records | Boot self-check, battery charging, fault event queries |
| Task Scheduling | Call, delivery task destination execution details |
| Store Data | Store list query, machine list query |
| Map Service | Map list, map details, current map, points, point groups, map images |
| Ad Playback & Config | Ad list, details, creation, update, deletion, scene menus |
| Cabinet Tasks & SKU | Product SKU sync, SKU query, cabinet list, cabinet delivery orders |

**Prerequisites:**

- `ApiAppKey` and `ApiAppSecret` from the [Pudu Open Platform](https://open.pudutech.com/zh/cloud-api/gjq71a2i4qzpgk0t2ooe3vi7)
- Supported clusters: `cn` (China), `sea` (Japan/Korea/Singapore), `de` (Germany), `us` (USA)

**Included request scripts:** JavaScript, Python, Go, Java, C#

### pudu-cloudveil-skill

Use PUDU CloudVeil / 云隐 OpenAPI for SSO + SM2 authentication, robot maps, robot status, robot tasks, robot control, callbacks, dispatch, order-to-person workflows, and data board statistics.

**Capabilities:**

| Category | Description |
|----------|-------------|
| Authentication | SSO secret retrieval, SM2 credential encryption, access token login |
| Common Services | Store, map, robot group, and position queries |
| Robot Info | Robot status and task status queries |
| Robot Tasks | Calling, delivery, transport, errand, lifting, tray, and guide tasks |
| Control | Position reporting, map switching, recharge, card swiping, device shadow |
| Statistics | Dashboard metrics, analysis reports, task details, and logs |
| Order-to-Person | Orders, tray configuration, aisles, picking, batches, and warehouses |
| Callbacks & Dispatch | Callback payload reference and dispatch-related workflows |

## Installation

The `skills` CLI installs skills from a repository source. On GitHub, you can use the `owner/repo` shorthand for this repository.

List available skills in this repository:

```bash
npx skills add pudu-robotics/skills --list
```

Install the Pudu OpenAPI skill into the current project:

```bash
npx skills add pudu-robotics/skills --skill pudu-openapi-skill
```

Install the Pudu CloudVeil skill into the current project:

```bash
npx skills add pudu-robotics/skills --skill pudu-cloudveil-skill
```

Install globally for a specific agent in non-interactive mode:

```bash
npx skills add pudu-robotics/skills --skill pudu-openapi-skill -g -a codex -y
```

Install the Pudu CloudVeil skill globally for a specific agent in non-interactive mode:

```bash
npx skills add pudu-robotics/skills --skill pudu-cloudveil-skill -g -a codex -y
```

## Skill Structure

Each skill follows a standard layout:

```
skills/<skill-name>/
├── SKILL.md          # Skill definition, workflow, and instructions
├── assets/           # OpenAPI spec files (JSON) and static resources
├── references/       # Capability lists and SDK references
└── scripts/          # Executable request helpers (multi-language)
```

## Contributing

1. Fork this repository
2. Create your skill under `skills/<your-skill-name>/`
3. Include a `SKILL.md` with clear workflow instructions
4. Submit a pull request
