# Mermaid 图表测试文件

用于测试深色/浅色主题下各类 Mermaid 图表的文字可见性。

---

## 1. 流程图 (Flowchart)

```mermaid
flowchart TD
    A[开始] --> B{条件判断}
    B -->|是| C[执行操作 A]
    B -->|否| D[执行操作 B]
    C --> E[合并结果]
    D --> E
    E --> F[结束]
    subgraph 子流程
        C
        D
    end
```

---

## 2. 时序图 (Sequence Diagram)

```mermaid
sequenceDiagram
    participant C as C++ 主循环
    participant S as Python 服务端

    loop 仿真 Tick
        C->>C: SyncFrame()，计算 TargetTimeSec
        C->>S: 发送 Request [seq_num, Timestamp, Ego 状态]
        Note right of S: 基于主车位姿处理交互<br/>步进推算到 TargetTimeSec
        S-->>C: 发送 Response [seq_num, Traffic 对象集合]
        C->>C: 阻塞等待并校验 SeqNum
        C->>C: 填充 mCurrStream，执行 UpdateActors()
    end
```

---

## 3. 甘特图 (Gantt)

```mermaid
gantt
    title 项目开发计划
    dateFormat  YYYY-MM-DD
    section 需求阶段
    需求调研           :done,    req1, 2024-01-01, 2024-01-07
    需求评审           :done,    req2, 2024-01-08, 3d
    section 开发阶段
    前端开发           :active,  dev1, 2024-01-11, 10d
    后端开发           :         dev2, 2024-01-11, 12d
    联调测试           :crit,    test, after dev2, 5d
    section 发布阶段
    上线部署           :         rel1, after test, 2d
```

---

## 4. 饼图 (Pie Chart)

```mermaid
pie title 技术栈占比
    "TypeScript" : 45
    "Rust" : 20
    "CSS" : 15
    "其他" : 20
```

---

## 5. 类图 (Class Diagram)

```mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
        +move() void
    }
    class Dog {
        +String breed
        +fetch() void
    }
    class Cat {
        +bool indoor
        +purr() void
    }
    Animal <|-- Dog
    Animal <|-- Cat
    Dog "1" --> "0..*" Cat : chases
```

---

## 6. 状态图 (State Diagram)

```mermaid
stateDiagram-v2
    [*] --> 空闲
    空闲 --> 加载中 : 打开文件
    加载中 --> 编辑中 : 加载完成
    加载中 --> 错误 : 加载失败
    编辑中 --> 保存中 : Ctrl+S
    保存中 --> 编辑中 : 保存成功
    保存中 --> 错误 : 保存失败
    编辑中 --> 空闲 : 关闭文件
    错误 --> 空闲 : 重置
    错误 --> [*]
```

---

## 7. ER 图 (Entity Relationship)

```mermaid
erDiagram
    USER {
        int id PK
        string name
        string email
        datetime created_at
    }
    DOCUMENT {
        int id PK
        string title
        string content
        int owner_id FK
        datetime updated_at
    }
    TAG {
        int id PK
        string name
    }
    DOCUMENT_TAG {
        int document_id FK
        int tag_id FK
    }
    USER ||--o{ DOCUMENT : "拥有"
    DOCUMENT }o--o{ TAG : "标记"
    DOCUMENT_TAG }|--|| DOCUMENT : ""
    DOCUMENT_TAG }|--|| TAG : ""
```

---

## 8. Git 图 (Git Graph)

```mermaid
gitGraph
    commit id: "init"
    commit id: "feat: 基础功能"
    branch feature/dark-mode
    checkout feature/dark-mode
    commit id: "feat: 深色主题"
    commit id: "fix: mermaid 颜色"
    checkout main
    commit id: "fix: 热修复"
    merge feature/dark-mode id: "merge: dark-mode" tag: "v1.1.0"
    commit id: "chore: 发布"
```

---

## 9. 思维导图 (Mindmap)

```mermaid
mindmap
  root((Marklite))
    编辑器
      CodeMirror
      Milkdown
      Vi 模式
    预览
      Markdown 渲染
      Mermaid 图表
      KaTeX 公式
    插件系统
      AI Copilot
      Git 集成
      反向链接
      关系图谱
    主题
      浅色
      深色
      护眼
      高对比
```

---

## 10. 时间线 (Timeline)

```mermaid
timeline
    title Marklite 版本历史
    section 2023
        v0.1.0 : 基础编辑功能
               : Markdown 预览
        v0.5.0 : 插件系统雏形
               : 主题支持
    section 2024
        v0.8.0 : Milkdown 集成
               : KaTeX 公式
        v0.9.0 : Mermaid 图表
               : AI Copilot 插件
    section 2025
        v1.0.0 : 正式发布
               : 深色主题修复
```

---

## 11. 象限图 (Quadrant Chart)

```mermaid
quadrantChart
    title Feature Priority Matrix
    x-axis Low Complexity --> High Complexity
    y-axis Low Value --> High Value
    quadrant-1 Implement Now
    quadrant-2 Plan
    quadrant-3 Defer
    quadrant-4 Reevaluate
    Mermaid Fix: [0.2, 0.9]
    Plugin HotReload: [0.7, 0.8]
    Custom Theme: [0.4, 0.6]
    Mobile Support: [0.9, 0.5]
    Spell Check: [0.3, 0.3]
```

---

## 12. 块图 (Block Diagram)

```mermaid
block-beta
    columns 3
    A["前端\n(React)"] B["Tauri\n(IPC 桥)"] C["后端\n(Rust)"]
    A --> B --> C
    D["插件运行时"] E["文件系统"] F["系统 API"]
    A --> D
    C --> E
    C --> F
```
