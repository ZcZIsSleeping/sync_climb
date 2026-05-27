# 同步攀登

同步攀登是一个面向攀登者的微信小程序原型与后端服务，用于同步个人攀登计划、团队活动和装备携带需求。

## 功能概览

- 个人日历：连续月历、长按滑动创建事件、事件移动、删除、待接受团队事件确认。
- 团队日历：团队列表、团队事件创建/删除/加入/退出、只看本 Team 活动筛选。
- 团队装备：按成员查看装备，团队事件中可为参与者分配装备数量。
- BaseCamp：本地账号登录、昵称编辑、个人装备类型和数量管理。
- 后端服务：Express + TypeScript + PostgreSQL，提供日历、团队、装备和本地测试登录接口。

## 项目结构

```text
.
├── miniprogram/        # 微信小程序页面与样式
├── server/             # Express 后端服务
├── typings/            # 小程序类型定义
├── project.config.json # 微信开发者工具项目配置
└── package.json        # 根目录 TypeScript 依赖
```

## 本地开发

安装依赖：

```bash
npm install
npm install --prefix server
```

启动 PostgreSQL 后，创建并初始化本地数据库：

```bash
createdb syn_climb
DATABASE_URL=postgres://syn_climb:syn_climb@localhost:5432/syn_climb npm run db:migrate --prefix server
```

启动后端服务：

```bash
DATABASE_URL=postgres://syn_climb:syn_climb@localhost:5432/syn_climb PORT=8787 npm run dev --prefix server
```

健康检查：

```bash
curl http://localhost:8787/health
```

小程序端使用微信开发者工具打开本目录。当前前端默认连接本地后端 `http://localhost:8787`。

## 测试

测试使用独立数据库：

```bash
createdb syn_climb_test
npm run test --prefix server
```

也可以分别运行：

```bash
npm run test:unit --prefix server
npm run test:integration --prefix server
```

## 后端配置

后端支持 `.env` 配置，示例见 [server/.env.example](server/.env.example)。

```text
PORT=8787
DATABASE_URL=postgres://syn_climb:syn_climb@localhost:5432/syn_climb
WECHAT_APPID=
WECHAT_SECRET=
```

未配置微信参数时，`/auth/wechat-login` 会使用本地 deterministic openid，方便开发阶段自由切换测试账号。

## 质量检查

```bash
npx tsc --noEmit
npm run build --prefix server
npm run test --prefix server
```
