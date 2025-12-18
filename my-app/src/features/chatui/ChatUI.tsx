import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
    Box,
    Button,
    TextField,
    Paper,
    Typography,
    List,
    ListItem,
    ListItemButton,
    ListItemText,
    ListItemIcon
} from "@mui/material";

// --- 新增部分：Mock 历史数据 ---
const MOCK_HISTORY_DATA = [
    "关于 '重返1999' 的配队建议",
    "艾尔登法环 DLC 入口在哪里？",
    "帮我写一封给甲方的道歉信",
    "React useEffect 依赖项死循环问题",
    "今晚吃什么？",
    "如何评价明日方舟的新干员",
    "CSGO 怎么拉枪线",
    "解释一下量子力学",
    "日语的敬语怎么用？",
    "推荐几部好看的科幻电影",
    "生成一个 python 爬虫脚本",
    "为什么猫咪会踩奶？",
    "2024年最值得玩的游戏Top 10"
];

// --- 新增部分：手写底部弹窗组件 (Bottom Sheet) ---
// 实现了: 1. 顶部把手拖拽关闭 2. 内部滚动不穿透 3. 仿原生动画
// --- 升级版：支持半开/全屏切换的手写底部弹窗 ---
// --- 终极优化版：HistoryBottomSheet ---
// 包含了性能优化、防止重绘冲突修复以及必要的注释

const HistoryBottomSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    // 状态管理：控制吸附位置
    const [snapState, setSnapState] = useState<'half' | 'full'>('half');
    const sheetRef = useRef<HTMLDivElement>(null);

    /**
     * 【性能优化 / Performance Optimization】
     * * Reactのレンダリングサイクル(Re-render)を回避し、60fpsの滑らかなジェスチャーを実現するため、
     * タッチイベント中は `useState` を使わず、直接DOMの `style.transform` を操作しています。
     * * We use Direct DOM Manipulation during touch gestures to bypass React's render cycle,
     * ensuring silky smooth performance (60fps) on mobile devices.
     */
    const dragInfo = useRef({
        startY: 0,
        currentDy: 0,
        isDragging: false,
        startTranslate: 0
    });

    // 预计算高度 (px)，避免在每一帧里做 calc 混合计算消耗性能
    const metrics = React.useMemo(() => {
        if (typeof window === 'undefined') return { full: 0, halfOffset: 0 };
        const vh = window.innerHeight;
        // 设定：全屏占 90%，半开占 50%
        const fullH = vh * 0.9;
        const halfH = vh * 0.5;
        // 半开时，顶部距离全屏位置(0)的偏移量
        const halfOffset = fullH - halfH;
        return { full: fullH, halfOffset };
    }, []);

    // 1. 初始化位置 (Anti-Flash)
    // 使用 useLayoutEffect 确保在浏览器绘制前将面板放到屏幕外
    useLayoutEffect(() => {
        if (sheetRef.current) {
            sheetRef.current.style.transform = 'translateY(100%)';
        }
    }, []);

    // 2. 状态驱动动画 (React Logic -> DOM)
    // 只有当 open 变化或吸附状态(snapState)变化时，才由 React 接管控制权
    useEffect(() => {
        if (sheetRef.current) {
            // 确保动画开启
            sheetRef.current.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';

            if (open) {
                // 根据状态决定目标位置
                const targetY = snapState === 'full' ? 0 : metrics.halfOffset;
                sheetRef.current.style.transform = `translateY(${targetY}px)`;
            } else {
                // 关闭时移出屏幕
                sheetRef.current.style.transform = 'translateY(100%)';
            }
        }
    }, [open, snapState, metrics]);

    // --- 手势处理 (Direct Manipulation) ---

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!sheetRef.current) return;

        dragInfo.current.isDragging = true;
        dragInfo.current.startY = e.touches[0].clientY;

        // 【关键】：手指按下瞬间，必须【关掉过渡动画】
        // 否则会有延迟感（Latency），让拖拽不跟手
        sheetRef.current.style.transition = 'none';

        // 记录当前的基准位置 (是从 half 还是 full 开始拖的)
        dragInfo.current.startTranslate = snapState === 'full' ? 0 : metrics.halfOffset;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!dragInfo.current.isDragging || !sheetRef.current) return;

        const currentY = e.touches[0].clientY;
        const delta = currentY - dragInfo.current.startY;

        // 阻尼逻辑 (Damping)
        let effectiveDelta = delta;
        // 如果在全屏状态下继续往上拉，增加阻力，防止拉过头太难看
        if (snapState === 'full' && delta < 0) {
            effectiveDelta = delta * 0.2;
        }

        // 实时计算目标位置 = 基准 + 偏移
        const targetY = dragInfo.current.startTranslate + effectiveDelta;

        // 记录本次拖拽距离用于松手判断
        dragInfo.current.currentDy = effectiveDelta;

        // 🔥 高频更新 DOM，不触发 React Render
        sheetRef.current.style.transform = `translateY(${targetY}px)`;
    };

    const handleTouchEnd = () => {
        if (!sheetRef.current) return;
        dragInfo.current.isDragging = false;

        const dy = dragInfo.current.currentDy;
        const threshold = 60; // 触发阈值 (px)

        // 恢复动画时间，准备回弹或切换状态
        sheetRef.current.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';

        // 状态判定逻辑
        if (snapState === 'half') {
            if (dy < -threshold) {
                setSnapState('full'); // 向上拖 -> 变全屏
            } else if (dy > threshold) {
                onClose(); // 向下拖 -> 关闭
            } else {
                // 距离不够，回弹到 Half
                sheetRef.current.style.transform = `translateY(${metrics.halfOffset}px)`;
            }
        } else {
            // full state
            if (dy > threshold) {
                setSnapState('half'); // 向下拖 -> 变半开
            } else {
                // 距离不够，回弹到 Full
                sheetRef.current.style.transform = `translateY(0px)`;
            }
        }

        // 重置
        dragInfo.current.currentDy = 0;
    };

    return (
        <>
            {/* 遮罩层 */}
            <Box
                onClick={onClose}
                sx={{
                    position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1200,
                    opacity: open ? 1 : 0,
                    pointerEvents: open ? 'auto' : 'none',
                    transition: 'opacity 0.3s'
                }}
            />
            {/* 弹窗本体 */}
            <Box
                ref={sheetRef}
                sx={{
                    position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1201,
                    bgcolor: '#fff',
                    borderTopLeftRadius: 20, borderTopRightRadius: 20,
                    // 使用动态计算的像素高度
                    height: `${metrics.full}px`,
                    boxShadow: '0px -4px 20px rgba(0,0,0,0.1)',
                    display: 'flex', flexDirection: 'column',

                    // 【关键修复 Risk #1】
                    // 不要在 JSX 里写 `transform: ...`，否则 React Re-render 时会覆盖你的手势
                    // 初始位置由 useLayoutEffect 控制

                    // 性能优化：提升为合成层
                    willChange: 'transform'
                }}
            >
                {/* 1. 拖拽把手 (Handle Area) */}
                <Box
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    sx={{
                        width: '100%', height: 48, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'grab', touchAction: 'none' // 阻止浏览器默认滚动行为
                    }}
                >
                    <Box sx={{ width: 36, height: 5, bgcolor: '#e0e0e0', borderRadius: 3 }} />
                </Box>

                {/* 2. 标题区 */}
                <Box sx={{ px: 3, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold">
                        {snapState === 'half' ? '近期履历' : '全部履历'}
                    </Typography>
                    <Button onClick={onClose} size="small" sx={{ color: '#999' }}>关闭</Button>
                </Box>

                {/* 3. 内容滚动区 (Content Area) */}
                <Box sx={{
                    flex: 1,
                    overflowY: 'auto',
                    // iOS 滚动惯性支持
                    WebkitOverflowScrolling: 'touch',
                    // 防止滚动穿透核心属性
                    overscrollBehaviorY: 'contain',
                    pb: 'env(safe-area-inset-bottom)'
                }}>
                    <List>
                        {[...MOCK_HISTORY_DATA, ...MOCK_HISTORY_DATA].map((item, index) => (
                            <ListItem key={index} disablePadding>
                                <ListItemButton>
                                    <ListItemIcon sx={{ minWidth: 36 }}>
                                        <span style={{ fontSize: 18 }}>🕒</span>
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={item}
                                        secondary="2025-12-18 14:30"
                                        primaryTypographyProps={{ fontSize: '0.95rem' }}
                                    />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </Box>
            </Box>
        </>
    );
};


// --- 原有逻辑代码 ---

interface ChatUIProps {
    userStackMode?: "bottom" | "top";
}

// 1. 数据结构：增加 options 字段
interface ChatTurn {
    user: string; // 如果为空字符串，表示是 AI 主动发起的（用户没说话）
    ai: string[] | null;
    options?: string[]; // 存放这一轮的“魔法卡片”选项，如果没有就是 undefined
}

// 2. 触发词列表：当 AI 回复包含这些话时，才会弹出选项
const TRIGGER_PHRASES = [
    "话说你喜欢什么游戏呀要不要一起玩~",
    "别想那么多，要不一起玩点游戏(｡･∀･)ﾉﾞ",
    "那么可以陪我玩游戏了吗~",
    "要不要一起来玩点游戏喵！"
];

// 3. 随机回复池
const AI_REPLY_POOL = [
    ["你说得对欸"],
    ["确实如此。", "我们可以从另一个角度来看这个问题。"],
    ["哈哈哈哈", "笑死我了", "你这个人真幽默！"],
    ["这就触及到我的知识盲区了...", "不过我觉得很有趣！"],
    ["这是一个非常深刻的问题。", "首先，我们需要定义什么是'对'。", "其次，我们要考虑语境。", "最后，结论显而易见。"],
    ["嗯...", "让我想想...", "好吧，你是对的。"],
    ["你说得对欸","但是我觉得不对"],
    ["别想那么多，要不一起玩点游戏(｡･∀･)ﾉﾞ"],
    ["你说的对！","话说你喜欢什么游戏呀要不要一起玩~"],
    ["好好好！","那么可以陪我玩游戏了吗~"],
];

// 4. 定义固定的游戏选项
const FIXED_OPTIONS = [
    "明日方舟",
    "原神",
    "艾尔登法环",
    "崩坏: 星穹铁道",
    "光与影: 33号远征队",
    "空洞骑士: 丝之歌",
    "重返1999",
    "CSGO",
    "英雄联盟",
    "那个游戏6",
    "绝区零",
    "鸣潮",
    "其他游戏",
];

// 5. 开场白配置 🌟
const AI_GREETINGS = [
    "喵~这里是泛用型人工智能原型机TATA~",
    "你也可以叫我塔塔(｡･∀･)ﾉﾞ",
    "要不要一起来玩点游戏喵！"
];

export default function ChatUI({ userStackMode = "top" }: ChatUIProps) {
    const [inputValue, setInputValue] = useState("");
    // 新增状态：控制历史弹窗
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // 🔥 初始化状态：植入开场白记忆，并立刻进行一次“触发检查”
    const [history, setHistory] = useState<ChatTurn[]>(() => {
        // 1. 拿到开场白内容
        const initialAiResponse = AI_GREETINGS;
        // 2. 这里的逻辑和 useEffect 里的一模一样：检查是否命中触发词
        const isTriggerMatch = initialAiResponse.some(line =>
            TRIGGER_PHRASES.includes(line)
        );
        // 3. 返回初始状态
        return [{
            user: "",
            ai: initialAiResponse,
            // 4. 如果命中了，直接给选项！
            options: isTriggerMatch ? FIXED_OPTIONS : undefined
        }];
    });

    const [isSending, setIsSending] = useState(false);
    const [containerHeight, setContainerHeight] = useState(0);

    const listRef = useRef<HTMLDivElement>(null);
    const latestTurnRef = useRef<HTMLDivElement>(null);

    const handleSend = (text: string) => {
        if (text.trim() === "") return;

        setHistory((prev) => [...prev, { user: text, ai: null }]);
        setInputValue("");
        setIsSending(true);
    };

    // 处理选项点击：发送消息 + 销毁选项
    const handleOptionClick = (optionText: string, turnIndex: number) => {
        // 1. 先把这个选项作为用户消息发送出去
        handleSend(optionText);

        // 2. 施展“消失魔法”：找到展示这些选项的那一轮对话，把 options 设为 undefined
        setHistory(prev => {
            const newHistory = [...prev];
            // 这里的 turnIndex 是用户点击的那一轮
            if (newHistory[turnIndex]) {
                newHistory[turnIndex] = {
                    ...newHistory[turnIndex],
                    options: undefined // 彻底移除，界面上就不会渲染了
                };
            }
            return newHistory;
        });
    };

    // 监听历史记录，模拟 AI 回复
    useEffect(() => {
        if (history.length === 0) return;

        const lastTurn = history[history.length - 1];

        // 如果最后一条是用户刚发的，且 AI 还没回
        if (lastTurn.ai === null) {
            const randomDelay = Math.floor(Math.random() * 1200) + 800;

            const timer = setTimeout(() => {
                // 1. 抽取回复
                const randomResponse = AI_REPLY_POOL[Math.floor(Math.random() * AI_REPLY_POOL.length)];

                // 2. 🔮 魔法安检：检查回复里是否包含触发词
                // 使用 some + includes 检查每一行，只要命中一句触发词即可
                const isTriggerMatch = randomResponse.some(line =>
                    TRIGGER_PHRASES.includes(line)
                );

                setHistory(prev => {
                    const newHistory = [...prev];
                    const index = newHistory.length - 1;
                    newHistory[index] = {
                        ...newHistory[index],
                        ai: randomResponse,
                        // 3. ⚖️ 条件分发：只有对上了暗号，才给 FIXED_OPTIONS，否则是 undefined
                        options: isTriggerMatch ? FIXED_OPTIONS : undefined
                    };
                    return newHistory;
                });
            }, randomDelay);
            return () => clearTimeout(timer);
        }
    }, [history]);

    useLayoutEffect(() => {
        const updateHeight = () => {
            if (listRef.current) {
                setContainerHeight(listRef.current.clientHeight);
            }
        };
        updateHeight();
        window.addEventListener('resize', updateHeight);
        return () => window.removeEventListener('resize', updateHeight);
    }, []);

    // 滚动逻辑控制
    useEffect(() => {
        if (history.length === 0) return;

        if (userStackMode === "bottom") {
            // 稍微延迟一点滚动，确保 DOM 已经渲染了新的高度
            requestAnimationFrame(() => {
                listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
            });
            setIsSending(false);
            return;
        }

        if (userStackMode === "top" && isSending && latestTurnRef.current) {
            latestTurnRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            setIsSending(false);
        }
    }, [history, isSending, userStackMode]);

    return (
        <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column", backgroundColor: "#ffffff", overflow: "hidden" }}>

            {/* --- 修改后的 Header：增加了履历按钮 --- */}
            <Box sx={{
                p: 2,
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
            }}>
                <Typography variant="h6">✧ TATA Chat ✧</Typography>
                <Button
                    variant="text"
                    size="small"
                    onClick={() => setIsHistoryOpen(true)}
                    sx={{ fontWeight: 'bold', color: '#1976d2' }}
                >
                    聊天历史
                </Button>
            </Box>

            <Paper
                ref={listRef}
                elevation={0}
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    px: 2,
                    py: 0,
                    scrollBehavior: "smooth",
                }}
            >
                {/*<Box sx={{ height: 20 }} />*/}

                {history.map((turn, i) => {
                    const isLast = i === history.length - 1;
                    const minHeightStyle = (userStackMode === "top" && isLast && containerHeight > 0)
                        ? `${containerHeight}px`
                        : "auto";

                    return (
                        <Box
                            key={i}
                            ref={isLast ? latestTurnRef : null}
                            sx={{
                                minHeight: minHeightStyle,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-start",
                                mb: isLast ? 0 : 3,
                                transition: "min-height 0.3s",
                                boxSizing: 'border-box',
                                pt: 2,
                                pb: 2,
                            }}
                        >
                            {/* --- 用户消息 --- */}
                            {/* 有当 user 有内容时才显示，这样开场白看起来就是 AI 独角戏 */}
                            {turn.user && (
                                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                    <Box
                                        sx={{
                                            backgroundColor: "#f0f4f9",
                                            color: "#1f1f1f",
                                            px: 2.5,
                                            py: 1.5,
                                            borderRadius: "18px",
                                            maxWidth: "61.8%",
                                            lineHeight: 1.6,
                                            wordBreak: "break-word",
                                            overflowWrap: "anywhere",
                                        }}
                                    >
                                        {turn.user}
                                    </Box>
                                </Box>
                            )}

                            {/* --- AI 回复区域 --- */}
                            <Box sx={{
                                // 如果是 AI 独角戏（user 为空），就不要顶部的间距了
                                mt: turn.user ? 2 : 0,

                                display: "flex",
                                flexDirection: "column",
                                gap: 1
                            }}>
                                {turn.ai ? (
                                    <>
                                        {turn.ai.map((line, idx) => (
                                            <Box
                                                key={idx}
                                                sx={{
                                                    display: "flex",
                                                    justifyContent: "flex-start",
                                                    animation: "fadeIn 0.5s ease-in forwards",
                                                    "@keyframes fadeIn": {
                                                        "0%": { opacity: 0, transform: "translateY(5px)" },
                                                        "100%": { opacity: 1, transform: "translateY(0)" }
                                                    }
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        backgroundColor: "#ffffff",
                                                        color: "#1f1f1f",
                                                        px: 0.5,
                                                        maxWidth: "90%",
                                                        lineHeight: 1.6,
                                                        wordBreak: "break-word",
                                                        overflowWrap: "anywhere",
                                                    }}
                                                >
                                                    {line}
                                                </Box>
                                            </Box>
                                        ))}

                                        {/* 4. 渲染选项卡片区域 */}
                                        {turn.options && turn.options.length > 0 && (
                                            <Box
                                                sx={{
                                                    mt: 1.5, // 稍微拉开一点距离，更透气
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    justifyContent: "flex-end",
                                                    gap: 1.2, // 增加间距，不那么拥挤
                                                    maxWidth: "100%",
                                                    alignSelf: "flex-end",
                                                    pl: 4,
                                                }}
                                            >
                                                {turn.options.map((opt, optIndex) => (
                                                    <Button
                                                        key={optIndex}
                                                        // 去掉 variant="outlined"，改用自定义样式
                                                        onClick={() => handleOptionClick(opt, i)}
                                                        sx={{
                                                            // --- 核心审美层 ---
                                                            borderRadius: "24px", // 变得非常圆润
                                                            border: "1px solid #e0e0e0", // 极淡的边框，似有若无
                                                            backgroundColor: "#ffffff", // 纯净的背景
                                                            color: "#424242", // 柔和的深灰，不要全黑

                                                            // --- 排版细节 ---
                                                            textTransform: "none", // 保持文字原样，不强制大写
                                                            fontSize: "0.875rem",
                                                            fontWeight: 500,
                                                            padding: "6px 16px", // 稍微大一点的点击区域
                                                            boxShadow: "0px 1px 2px rgba(0,0,0,0.05)", // 非常轻微的投影，增加层次感

                                                            // --- 魔法动效 ---
                                                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", // 丝滑的过渡
                                                            animation: `fadeInUp 0.4s ease-out backwards`, // 进场动画
                                                            animationDelay: `${optIndex * 0.05}s`, // 费曼技巧：每个气泡延迟一点点出现，像波浪一样！

                                                            "@media (hover: hover)": {
                                                                "&:hover": {
                                                                    backgroundColor: "#f0f7ff",
                                                                    borderColor: "#80d8ff",
                                                                    color: "#0277bd",
                                                                    transform: "translateY(-2px)",
                                                                    boxShadow: "0px 4px 8px rgba(2, 119, 189, 0.15)",
                                                                },
                                                            },

                                                            // 定义一下局部的 keyframes (如果没有全局定义的话，MUI sx 支持内联不大方便，
                                                            // 但通常 Box 的 fadeIn 已经够用。如果想要逐个弹出的效果，配合上面的 animationDelay 即可)
                                                            "@keyframes fadeInUp": {
                                                                "0%": { opacity: 0, transform: "translateY(10px)" },
                                                                "100%": { opacity: 1, transform: "translateY(0)" }
                                                            }
                                                        }}
                                                    >
                                                        {opt}
                                                    </Button>
                                                ))}
                                            </Box>
                                        )}
                                    </>
                                ) : (
                                    // 5. 显示“思考中”状态
                                    // 无论 top 还是 bottom 模式，只要是最后一条且没回复，都显示
                                    isLast && (
                                        <Box sx={{ ml: 1, display: "flex", alignItems: "center" }}>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    fontStyle: "italic",
                                                    animation: "pulse 1.5s infinite ease-in-out",
                                                    "@keyframes pulse": {
                                                        "0%": { opacity: 0.4 },
                                                        "50%": { opacity: 1 },
                                                        "100%": { opacity: 0.4 }
                                                    }
                                                }}
                                            >
                                                ✧ TATA 正在思考喵...
                                            </Typography>
                                        </Box>
                                    )
                                )}
                            </Box>
                        </Box>
                    );
                })}
            </Paper>

            <Box sx={{ p: 2, pb: "calc(env(safe-area-inset-bottom) + 16px)", backgroundColor: "#ffffff", position: "sticky", bottom: 0, zIndex: 10, borderTop: "1px solid #eee" }}>
                <Box sx={{ display: "flex", gap: 1, backgroundColor: "#f0f4f9", p: 1, borderRadius: "28px" }}>
                    <TextField
                        fullWidth placeholder="说点什么喵~" variant="standard"
                        InputProps={{ disableUnderline: true, sx: { px: 2 } }}
                        value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend(inputValue)}
                    />
                    <Button variant="contained" onClick={() => handleSend(inputValue)} sx={{ borderRadius: "20px" }}>发送</Button>
                </Box>
            </Box>

            {/* --- 新增：插入手写底部弹窗组件 --- */}
            <HistoryBottomSheet
                open={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />

        </Box>
    );
}