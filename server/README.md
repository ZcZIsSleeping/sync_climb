# 同步攀登后端服务

本目录是本地后端服务，使用 Express + TypeScript + PostgreSQL。

## 本地数据库

当前本机已通过 Homebrew 安装并启动 PostgreSQL 16：

```bash
HOMEBREW_NO_AUTO_UPDATE=1 brew services start postgresql@16
```

本地开发数据库：

```text
DATABASE_URL=postgres://syn_climb:syn_climb@localhost:5432/syn_climb
```

初始化数据库：

```bash
DATABASE_URL=postgres://syn_climb:syn_climb@localhost:5432/syn_climb npm run db:migrate --prefix server
```

## 启动服务

```bash
DATABASE_URL=postgres://syn_climb:syn_climb@localhost:5432/syn_climb PORT=8787 npm run dev --prefix server
```

健康检查：

```bash
curl http://localhost:8787/health
```

## 测试

测试默认使用独立数据库：

```text
postgres://syn_climb:syn_climb@localhost:5432/syn_climb_test
```

首次运行前创建测试数据库：

```bash
/opt/homebrew/opt/postgresql@16/bin/psql postgres -c "CREATE DATABASE syn_climb_test OWNER syn_climb"
```

运行测试：

```bash
npm run test:unit --prefix server
npm run test:integration --prefix server
npm run test --prefix server
```

## 微信登录

`POST /auth/wechat-login` 支持两种模式：

- 配置 `WECHAT_APPID` 和 `WECHAT_SECRET` 后，请求微信 `jscode2session` 获取真实 `openid`。
- 未配置时，开发环境使用 `local_${code}` 作为稳定 openid，方便本地联调。

## 主要接口模块

- `POST /auth/wechat-login`
- `GET /gear-types`
- `POST /gear-types`
- `GET /me/gears`
- `POST /me/gears`
- `PATCH /me/gears/:gearId`
- `DELETE /me/gears/:gearId`
- `GET /me/calendar/events`
- `POST /me/events`
- `PATCH /me/events/:eventId`
- `PATCH /me/events/:eventId/move`
- `DELETE /me/events/:eventId`
- `POST /me/events/:eventId/accept`
- `POST /me/events/:eventId/reject`
- `GET /teams`
- `POST /teams`
- `POST /teams/join`
- `DELETE /teams/:teamId/leave`
- `GET /teams/:teamId/calendar/events`
- `POST /teams/:teamId/events`
- `GET /teams/:teamId/events/:eventId`
- `POST /teams/:teamId/events/:eventId/join`
- `POST /teams/:teamId/events/:eventId/leave`
- `PATCH /teams/:teamId/events/:eventId`
- `PATCH /teams/:teamId/events/:eventId/move`
- `DELETE /teams/:teamId/events/:eventId`
- `PATCH /teams/:teamId/events/:eventId/gear-requirements`
