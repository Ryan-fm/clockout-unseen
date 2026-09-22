# 开发记录 · Development notes

作者 / Creator: Ryan-fm。记录日期：2026-09-22。

## GPT-6 Astra 的参与 / Model contribution

本项目由创作者在 Codex 中使用 GPT-6 Astra 迭代开发。模型协助把“下班不被发现”的想法落实为办公室潜行玩法，完成 React / Canvas 2D 实现、移动和家具碰撞、NPC 巡逻与视野遮挡、道具交互、三关衔接、手机操作和测试。

创作者选择游戏方向、确认场景画风与布局，并在试玩后提出具体修改：被巡逻发现必须立刻失败，以及由单关扩展为三关。模型根据这些反馈修改和验证。它不是 one-shot 测试，也不宣称一次生成即完成。

GPT-6 Astra assisted with gameplay design, React/Canvas implementation, collisions and line-of-sight detection, patrols, disguises, three-level progression, mobile controls, and verification in Codex. The creator supplied the concept, approved the art direction, and requested immediate failure on detection and three sequential levels. This was an iterative collaboration, not a one-shot generation.

办公室及人物 PNG 由 Codex 中的图像生成工具生成，代码模型负责组织素材和接入游戏；不将独立图像生成工具的产出归为代码模型直接绘制。美术提示词保存在 `prompts/`。

## 实际需求摘录 / Selected creation prompts

以下是与游戏制作相关的原始需求摘录，按顺序保留，不是完整聊天记录：

> 做一个 下班不被发现 怎么样，符合热门话题吗
>
> 你先给我 把 游戏的场景 确认好 然后主要的操作模式
>
> 可以 你先设计场景图 然后确认
>
> 画风和布局没有问题 可以按照这个方向继续
>
> 这里有问题 当被巡逻查到时 为什么还能继续？
>
> 然后你需要设置 三关 不要只是第一关

## V1 已发布版本与历史验证

- 三关共享已确认的手绘办公室布局，使用不同巡逻路线、速度、老板出场时间、咖啡机持续时间和电梯等待时间。
- 无保护时首次进入未遮挡视野即失败；失败后停止移动、计时与交互，不能补用道具。
- 文件夹提供 6 秒提前伪装，空工位提供原地伪装；咖啡机可短暂转移主管注意。
- 13 项引擎测试覆盖碰撞、遮挡、即时失败、冻结、伪装到期、暂停、超时、关卡衔接和重试。
- 连续三关通关测试使用真实巡逻与合法移动，不移除 NPC；这属于引擎测试，不等同于逐关手工浏览器通关。
- 4 项 Sites 检查覆盖静态资源、回退和构建结构。
- 浏览器已检查桌面和手机布局、开始、暂停及部分输入；未在物理手机上测试。
- `docs/gameplay.jpg` 为 2026-09-22 从 B站 Toy 正式三关版截取的运行画面，没有修改游戏内容。

## 试玩

https://www.bilibili.com/toy/clockout-unseen/index.html

2026-09-22 Toy 状态已核实为已发布、公开可见。可通过上述名称链接进入游戏，无需下载、安装或本地搭建。

## V2 源码更新与验证

V2 源码新增三张 3000 × 2000 地图、随机导航巡逻、普通 / 变态 / 地狱难度、地狱双层流程、跟随镜头、小地图与地图图鉴。更新规格见 [V2 更新说明](V2更新说明.md)。上面的 V1 截图和试玩链接不表示 V2 已上线；本次提交只更新源码及文档。

- `npm test`：15 项通过，含 11 项游戏引擎检查和 4 项托管检查。
- 引擎检查覆盖地图互动点可达、路径移动、跨地图和难度的随机巡逻不穿墙、即时捕获和冻结、保护到期、换层计时、重试和三关推进。
- V2 逃离路线测试移除了巡逻 NPC，用于验证路线和关卡状态，不代表已经完成全部难度的真实巡逻通关。
- `npm run build` 通过。旧版的 17 项测试属于 V1 历史结果，不是当前 V2 测试数量。

## 当前限制

单人、中文界面；V2 尚未更新到 B站正式试玩。角色使用单姿态摆动与独立坐姿，尚无完整逐帧行走动画。成绩只存在本机，没有账号系统、云存档或在线排行榜。V2 尚未完成所有难度的手工全程通关验证。
