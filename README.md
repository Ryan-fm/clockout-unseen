# 准点下班，别被发现 · Clock Out Unseen

一款三关办公室潜行小游戏：工作做完了，躲开主管和老板的视线，借助咖啡机、文件夹和空工位，赶在倒计时结束前进入电梯。

**[直接试玩 · Play in browser](https://www.bilibili.com/toy/clockout-unseen/index.html)** · [开发记录与 GPT-6 Astra 的参与](docs/DEVELOPMENT.md)

![三关正式版实机画面：玩家、主管巡逻视野、掩体、道具与电梯出口](docs/gameplay.jpg)

*A three-level office stealth game. Avoid patrol sightlines, distract the supervisor, disguise yourself with a folder, and reach the elevator before time runs out.*

作者 / Creator: [Ryan-fm](https://github.com/Ryan-fm)。单人、中文界面，支持电脑键盘和手机触控。浏览器直接运行，无须安装或配置 API Key；游戏本身无登录或付费机制，线上入口由 B站 Toy 托管。

## 玩法与操作

- WASD / 方向键：移动；手机使用左侧摇杆。
- E / 互动按钮：取文件、坐下伪装、呼叫或进入电梯、开启咖啡机。
- 空格 / 文件夹按钮：消耗文件夹，获得 6 秒伪装，必须在暴露之前使用。
- Esc / 暂停按钮：暂停；切换窗口自动暂停。
- 无掩体或伪装保护时，被主管或老板看见立即失败，本关冻结后可重试。

| 关卡 | 限时 | 电梯等待 | 巡逻变化 |
| --- | --- | --- | --- |
| 1 · 准点开溜 | 90 秒 | 3 秒 | 熟悉路线，老板 16 秒后出门 |
| 2 · 双重巡查 | 75 秒 | 4 秒 | 主管加速并改变路线，老板 5 秒后出门 |
| 3 · 最后一班电梯 | 60 秒 | 5 秒 | 主管从出口走廊开始，老板立即巡视 |

三关沿用同一办公室场景，依次通关；失败只重试当前关。全通后显示三关总用时，并将最快成绩保存在本机浏览器。刷新会从第一关重新开始，无云存档和在线排行榜。

## 本地运行 / Development

建议 Node.js 22.12+。

```sh
npm ci
npm run dev -- --host 127.0.0.1 --port 4186 --strictPort
```

打开终端输出的本地地址。

```sh
npm test
npm run build
npm run preview -- --host 127.0.0.1
```

生产静态文件在 `dist/client/`。资源使用相对路径，可部署到网站子目录。Sites 兼容构建还会生成 `dist/server/` 和托管元信息；上传 Toy 时只使用 `dist/client/`。

## 技术与文件

React 19、Vite 6、Canvas 2D、Web Audio。无需游戏服务端。

- `src/engine.js`：移动碰撞、视野遮挡、巡逻、道具、三关状态。
- `src/App.jsx` / `src/styles.css`：Canvas 画面、HUD、键盘与触控交互。
- `public/assets/`：办公室背景、人物和坐姿素材。
- `tests/`：13 项游戏逻辑测试与 4 项托管构建检查。
- `prompts/`：美术生成提示词。
- `docs/DEVELOPMENT.md`：开发过程、模型参与、验证范围与限制。

## 素材说明

办公室及人物美术通过 Codex 的图像生成工具制作，玩法代码通过 GPT-6 Astra 在 Codex 中迭代实现。项目不是一次提示生成；玩法、检测规则和关卡数量根据实际反馈修改。美术生成与代码模型的贡献分别记录，见开发说明。
