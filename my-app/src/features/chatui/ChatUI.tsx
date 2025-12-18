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
const HistoryBottomSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    // 状态管理
    // 'half' = 50%高度 (初始状态)
    // 'full' = 90%高度
    const [snapState, setSnapState] = useState<'half' | 'full'>('half');
    const [dragDy, setDragDy] = useState(0); // 手指拖拽的实时偏移量
    const [isDragging, setIsDragging] = useState(false);

    const startY = useRef(0);
    const sheetRef = useRef<HTMLDivElement>(null);

    // 每次打开时，重置为“半开”状态
    useEffect(() => {
        if (open) {
            setSnapState('half');
            setDragDy(0);
        }
    }, [open]);

    // --- 计算 CSS 变量 ---
    // 我们设定最大高度是 90vh，半开高度是 50vh
    // 那么半开时，需要向下偏移 (90 - 50) = 40vh
    const FULL_HEIGHT_VH = 90;
    const HALF_HEIGHT_VH = 50;
    const HALF_OFFSET_VH = FULL_HEIGHT_VH - HALF_HEIGHT_VH; // 40vh

    // 获取当前的基准偏移量 (vh 转 px 的逻辑交给 CSS calc 处理会更顺滑，但 JS 计算便于手势逻辑)
    // 这里为了简单，我们用 CSS 里的 calc 来做基准，JS 只负责拖拽的 delta

    // --- 手势逻辑 ---
    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        startY.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        const currentY = e.touches[0].clientY;
        const delta = currentY - startY.current; // 向下是正数，向上是负数

        // 逻辑限制：
        // 1. 如果是全屏状态，不允许往上拖太多 (阻尼效果)
        if (snapState === 'full' && delta < 0) {
            setDragDy(delta * 0.2); // 阻尼
            return;
        }

        // 2. 如果是半开状态，向上拖是负数（去全屏），向下拖是正数（去关闭）
        setDragDy(delta);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        const threshold = 60; // 拖拽阈值 (px)，超过这个距离才触发切换

        if (snapState === 'half') {
            // --- 在半开状态下 ---
            if (dragDy < -threshold) {
                // 向上拖动超过阈值 -> 变全屏
                setSnapState('full');
            } else if (dragDy > threshold) {
                // 向下拖动超过阈值 -> 关闭
                onClose();
            }
            // 否则回弹 (什么都不做，dragDy 会被重置为 0)
        } else {
            // --- 在全屏状态下 ---
            if (dragDy > threshold) {
                // 向下拖动超过阈值 -> 变半开
                setSnapState('half');
            } else {
                // 向上拖动或者拖动距离不够 -> 回弹保持全屏
                // (no-op)
            }
        }

        setDragDy(0); // 重置拖拽偏移
    };

    // 计算最终的 translateY
    // 逻辑：基准偏移 (由状态决定) + 手指拖动偏移
    //
    // State 'full': 基准 0vh
    // State 'half': 基准 40vh
    // Closed: 基准 100%

    let baseTranslate = '100%';
    if (open) {
        baseTranslate = snapState === 'full' ? '0px' : `${HALF_OFFSET_VH}vh`;
    }

    return (
        <>
            {/* 遮罩层 (全屏时颜色深一点，半开时浅一点) */}
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
                    height: `${FULL_HEIGHT_VH}vh`, // 始终渲染 90vh 的高度
                    boxShadow: '0px -4px 20px rgba(0,0,0,0.1)',

                    // 核心动画逻辑
                    transform: `translateY(calc(${baseTranslate} + ${isDragging ? dragDy : 0}px))`,

                    // 拖拽时不要过渡动画(跟手)，松开时要有过渡动画(回弹)
                    transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',

                    display: 'flex', flexDirection: 'column'
                }}
            >
                {/* 1. 拖拽把手区域 */}
                <Box
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    sx={{
                        width: '100%', height: 48, flexShrink: 0, // 加大一点触控区域
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'grab', touchAction: 'none'
                    }}
                >
                    {/* 视觉上的把手条 */}
                    <Box sx={{ width: 36, height: 5, bgcolor: '#e0e0e0', borderRadius: 3 }} />
                </Box>

                {/* 2. 标题区 */}
                <Box sx={{ px: 3, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontWeight="bold">
                        {snapState === 'half' ? '近期对话' : '全部对话'}
                    </Typography>
                    <Button onClick={onClose} size="small" sx={{ color: '#999' }}>关闭</Button>
                </Box>

                {/* 3. 内容滚动区 */}
                <Box sx={{
                    flex: 1,
                    overflowY: 'auto',
                    overscrollBehaviorY: 'contain',
                    WebkitOverflowScrolling: 'touch',
                    pb: 'env(safe-area-inset-bottom)'
                }}>
                    <List>
                        {/* 增加一些数据，让全屏滚动更有意义 */}
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