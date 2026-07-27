# CLAUDE.md

本文件为 Claude Code 在本仓库工作时的项目约定。

## 语言约定

- **硬性规定：本项目对话（聊天框）必须使用简体中文回复，不得使用其他语言。**
- **所有自然语言一律使用简体中文**，包括但不限于：
  - 面向用户的界面文案与提示
  - 代码注释、提交信息、PR 描述
  - 文档（`docs/`）与本文件
  - 助手在对话中的回复
- i18n 词条中的 `zh` 语言必须为简体中文；`en` / `es-MX` 为对应翻译，新增词条时三种语言都要补齐。
- **禁止在页面/组件里硬编码任何面向用户的中文**，一律走 i18n：服务端组件用 `getRequestLocale()` + `getDictionary()` + `t(messages, key)`；客户端组件用 `useI18n()` 的 `t(key)`。页面文案键统一放在 `pg.<模块>.*` 命名空间下（如 `pg.sales.orders.title`）。
- 若截图或参考资料为英文/繁体，落地到本系统时统一转为简体中文（专有名词、单据号、SKU 等保持原样）。

## 技术栈

- Next.js（App Router）+ TypeScript + Tailwind CSS
- Supabase（Postgres + RLS），数据访问经由 `lib/supabase/*`
- i18n：`messages/{zh,en,es-MX}.json` + `lib/i18n/*`，客户端用 `useI18n()`，服务端用 `getDictionary()` / `t()`

## 常用校验

改动后请自查：

```bash
npx tsc --noEmit      # 类型检查
npx eslint <files>    # 代码规范
npm run build         # 生产构建（验证 RSC / 路由）
```
