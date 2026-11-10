# AI Frontier — Design System

> 参考：Linear.app、Vercel、Raycast 的设计语言，Dark-first，Premium Tech 风格

---

## Color Palette

### Background
```
--bg-base:       #0F0F0F   # 主背景（非纯黑，减少眼疲劳）
--bg-surface:    #161616   # 卡片/面板
--bg-elevated:   #1E1E1E   # 悬浮元素/hover状态
--bg-overlay:    #242424   # 模态/下拉
```

### Border
```
--border-subtle:  #222222   # 最轻，分割线
--border-default: #2E2E2E   # 卡片边框
--border-strong:  #404040   # hover/focus边框
```

### Text
```
--text-primary:   #F0F0F0   # 主标题
--text-secondary: #A8A8A8   # 描述文字
--text-muted:     #666666   # 辅助/时间戳
--text-disabled:  #404040
```

### Accent — 三个核心项目各有颜色
```
--accent-a2a:       #8B5CF6  # violet — A2A协作
--accent-agent-ads: #F97316  # orange — Agent广告链路
--accent-geo:       #06B6D4  # cyan   — GEO内容增强
--accent-general:   #6B7280  # gray   — 通用前沿
```

### Brand Accent
```
--accent-primary:  #3B82F6   # blue（主色调，链接/CTA）
--accent-emerald:  #10B981   # 洞见高亮
```

---

## Typography

### Font Stack
- UI/Body: `Inter` (Google Fonts)
- Mono/Code/数字: `JetBrains Mono`

### Scale
```
display:    32px / 700 / -0.02em  # 页面大标题
title:      20px / 600 / -0.01em  # section标题
body:       14px / 400 / 0.01em   # 正文
caption:    12px / 400 / 0.02em   # 标签/时间
```

---

## Component Patterns

### Card
- `bg-[#161616]` + `border border-[#2E2E2E]`
- `rounded-2xl` (16px)
- `p-5` padding
- hover: `border-[#404040]` + `bg-[#1E1E1E]`
- transition: `transition-all duration-200`

### Badge / Tag
- 半透明底色 + 同色系文字
- e.g. A2A: `bg-violet-500/10 text-violet-400 border border-violet-500/20`
- `rounded-full` + `px-2.5 py-0.5` + `text-xs`

### Insight Block (产品洞见)
- `bg-emerald-950/30 border-l-2 border-emerald-500 text-emerald-400`
- 左侧竖线 accent 风格
- `px-4 py-3 rounded-r-lg`

### Editor Note（今日洞见）
- Glassmorphism：`backdrop-blur-sm bg-white/[0.03] border border-white/[0.08]`
- `rounded-2xl p-6`

---

## Layout

- Max-width: `1200px` centered
- 主内容区：12列grid，大屏双栏，小屏单栏
- Header sticky，毛玻璃背景
- Section间距：`mb-10`

---

## Animation

- 卡片 hover: `scale-[1.01]`（细微放大感）
- 内容出现: `opacity-0 → opacity-100`, `translateY(8px) → 0`
- Duration: 200ms ease-out
- 不用 Framer Motion（减少依赖），用 Tailwind `transition-all`

---

## References
- Linear Design System: https://linear.style/
- Raycast Colors: #FF6363 / #151515 / #929292
- Vercel Geist: off-black #0A0A0A base
- shadcn/ui v4 + Tailwind CSS v4 CSS-first approach
- Glassmorphism: backdrop-blur + rgba overlay，选择性使用
