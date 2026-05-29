# 同步攀登开发手册

## 开发原则

本项目分为微信小程序前端和 Express 后端。开发时必须先确认当前运行模式，避免把开发登录或本地 API 带到线上。

前端模式只由 `miniprogram/config/env.ts` 中的 `APP_MODE` 决定：

- `dev`：开发模式，使用预注册账号登录，API 指向 `http://localhost:8787`。
- `online`：线上模式，使用微信登录，API 指向 `https://www.synclimb.online`。

不要直接在页面里手改 API 地址或登录逻辑。使用脚本切换模式。

## 模式切换

切到开发模式：

```bash
npm run mode:dev
```

效果：

- `APP_MODE=dev`
- `LOGIN_MODE=local`
- `API_BASE=http://localhost:8787`

切到线上模式：

```bash
npm run mode:online
```

效果：

- `APP_MODE=online`
- `LOGIN_MODE=wechat`
- `API_BASE=https://www.synclimb.online`

兼容旧命令：

```bash
scripts/set-api-base.sh local
scripts/set-api-base.sh remote
```

这两个命令现在只是 `set-app-mode.sh` 的包装。

## 本地开发启动

安装依赖：

```bash
npm install
npm install --prefix server
```

准备数据库：

```bash
createdb syn_climb
DATABASE_URL=postgres://syn_climb:syn_climb@localhost:5432/syn_climb npm run db:migrate --prefix server
```

推荐直接用本地部署脚本：

```bash
npm run deploy:local
```

脚本会：

- 切到 `dev` 模式。
- 安装缺失依赖。
- 执行数据库迁移。
- 以 `ENABLE_LOCAL_LOGIN=true` 启动后端。

手动启动后端时也要带上本地登录开关：

```bash
DATABASE_URL=postgres://syn_climb:syn_climb@localhost:5432/syn_climb \
PORT=8787 \
ENABLE_LOCAL_LOGIN=true \
npm run dev --prefix server
```

健康检查：

```bash
curl http://localhost:8787/health
```

## 本地登录账号

开发模式下 BaseCamp 显示账号密码登录框。预注册账号：

- `alice / 123456`
- `bob / 123456`
- `xiaozou2 / 123456`

这些账号只用于本地验收。后端只有在 `ENABLE_LOCAL_LOGIN=true` 时才允许 `/auth/local-login`。

线上环境必须保持：

```text
ENABLE_LOCAL_LOGIN=false
```

或不设置该变量。

## 微信登录

线上模式下 BaseCamp 显示微信登录按钮，调用 `/auth/wechat-login`。

后端需要配置：

```text
WECHAT_APPID=
WECHAT_SECRET=
```

未配置微信参数时，后端会使用 `local_${code}` 生成本地 openid，方便后端测试。但前端线上模式仍然走 `wx.login`。

## 小程序开发

用微信开发者工具打开仓库根目录。

开发前确认：

```bash
npm run mode:dev
```

然后启动本地后端。小程序会连接 `http://localhost:8787`，登录区显示预注册账号登录。

准备提交或部署前确认：

```bash
npm run mode:online
```

小程序会连接线上 API，登录区显示微信登录。

## 测试与质量检查

后端测试使用独立测试库：

```bash
createdb syn_climb_test
npm run test --prefix server
```

常用检查：

```bash
npx tsc --noEmit
npm run build --prefix server
npm run test --prefix server
```

## 线上部署

部署当前分支：

```bash
npm run deploy:online -- "提交备注"
```

脚本会：

- 切到 `online` 模式。
- 运行类型检查、后端构建、后端测试。
- 提交当前改动。
- 推送当前分支。
- SSH 到线上服务器拉取同一分支。
- 安装依赖、构建、迁移数据库并重启 `synclimb-backend`。
- 检查 `https://www.synclimb.online/health`。

线上后端环境文件通常在 `/etc/synclimb/backend.env`。必须包含正式数据库和微信配置，不要启用本地登录。

## 提交前检查清单

- `miniprogram/config/env.ts` 是否是目标模式。
- 本地功能验收是否已在 `dev` 模式完成。
- 线上部署前是否已切到 `online` 模式。
- `ENABLE_LOCAL_LOGIN` 是否只在本地启用。
- `npx tsc --noEmit` 是否通过。
- `npm run test --prefix server` 是否通过。

## 常见问题

### 小程序登录区显示账号密码，但我想测微信登录

运行：

```bash
npm run mode:online
```

### 小程序登录区显示微信登录，但我想本地快速切账号

运行：

```bash
npm run mode:dev
```

并确认后端启动时带了：

```text
ENABLE_LOCAL_LOGIN=true
```

### 本地账号登录返回失败

检查后端是否启动、API 是否是本地、后端环境是否启用了本地登录：

```bash
curl http://localhost:8787/health
rg APP_MODE miniprogram/config/env.ts
```

### 线上不能使用预注册账号

这是预期行为。线上模式只允许微信登录，后端也不应启用 `/auth/local-login`。
