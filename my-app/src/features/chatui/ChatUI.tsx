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
    ListItemIcon,
    // --- 手风琴卡片组件 ---
    Accordion,
    AccordionSummary,
    AccordionDetails,
    // --- 新增：IconButton 用于点赞按钮 ---
    IconButton
} from "@mui/material";
// --- 图标 ---
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
// --- 新增：点赞点踩图标 (实心/空心) ---
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import ThumbDownIcon from "@mui/icons-material/ThumbDown";

// --- Mock 历史数据 ---
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

// --- 手写底部弹窗组件 (Bottom Sheet) ---
// [核心特性]:
// 1. 高性能: 使用直接 DOM 操作 (绕过 React 渲染循环) 实现 60fps 丝滑手势。
// 2. 严格限位: 彻底防止底部边缘被拉离屏幕底部 (0像素死锁逻辑)。
// 3. 原生质感: 实现了动画的无缝接管和流畅的吸附效果。

const HistoryBottomSheet = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
    // 逻辑状态：控制吸附点 ('half' 半开 vs 'full' 全屏)
    const [snapState, setSnapState] = useState<'half' | 'full'>('half');
    const sheetRef = useRef<HTMLDivElement>(null);

    // 常量：为了彻底隐藏底部的 box-shadow，在收起状态下额外向下移动 30px
    const HIDDEN_OFFSET = 30;

    // [性能策略]
    // 使用 Mutable Ref 而不是 useState 来追踪手势数据。
    // 这样可以避免在高频 'touchmove' 事件 (~120Hz) 中触发 React 的重新渲染 (Re-render)。
    const dragInfo = useRef({
        startY: 0,
        currentDy: 0,
        isDragging: false,
        startTranslate: 0
    });

    // 预计算布局参数，节省拖拽时主线程的计算资源
    const metrics = React.useMemo(() => {
        if (typeof window === 'undefined') return { full: 0, halfOffset: 0 };
        const vh = window.innerHeight;
        const fullH = vh * 0.9; // 最大高度: 90vh
        const halfH = vh * 0.5; // 初始高度: 50vh
        const halfOffset = fullH - halfH;
        return { full: fullH, halfOffset };
    }, []);

    // [辅助函数] 获取 DOM 实时位置
    // 在动画运行中如果用户突然触摸，我们需要获取当前的真实位置，防止画面跳变。
    const getCurrentTranslateY = () => {
        if (!sheetRef.current) return 0;
        const style = window.getComputedStyle(sheetRef.current);
        const matrix = new WebKitCSSMatrix(style.transform);
        return matrix.m42;
    };

    // 1. 初始化 (防止闪烁)
    // 在浏览器绘制第一帧之前，将面板移出屏幕外。
    useLayoutEffect(() => {
        if (sheetRef.current) {
            sheetRef.current.style.transform = `translateY(calc(100% + ${HIDDEN_OFFSET}px))`;
        }
    }, []);

    // 2. 状态同步 (React -> DOM)
    // 当 React 状态改变时，驱动打开/关闭/吸附的 CSS 动画。
    useEffect(() => {
        if (sheetRef.current) {
            sheetRef.current.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
            if (open) {
                const targetY = snapState === 'full' ? 0 : metrics.halfOffset;
                sheetRef.current.style.transform = `translateY(${targetY}px)`;
            } else {
                sheetRef.current.style.transform = `translateY(calc(100% + ${HIDDEN_OFFSET}px))`;
            }
        }
    }, [open, snapState, metrics]);

    // --- 手势处理 (Direct Manipulation / 直接操作) ---

    const handleTouchStart = (e: React.TouchEvent) => {
        if (!sheetRef.current) return;

        dragInfo.current.isDragging = true;
        dragInfo.current.startY = e.touches[0].clientY;

        // [关键点]: 读取 DOM 的真实位置。
        // 即使动画还在进行中，也能实现 1:1 的无缝跟手。
        const currentY = getCurrentTranslateY();
        dragInfo.current.startTranslate = currentY;

        // 关闭过渡动画，防止拖拽时出现“滞后感”
        sheetRef.current.style.transition = 'none';
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!dragInfo.current.isDragging || !sheetRef.current) return;

        const currentY = e.touches[0].clientY;
        const delta = currentY - dragInfo.current.startY;

        let rawTargetY = dragInfo.current.startTranslate + delta;

        // [核心修复]: 严格的 0 地板逻辑 (Zero Floor Logic)
        // "rawTargetY < 0" 意味着用户试图把弹窗拖得比全屏还高。
        // 我们强制将其设为 0。这保证了弹窗底部边缘永远不会离开屏幕底部 (防止拔根)。
        if (rawTargetY < 0) {
            rawTargetY = 0;
        }

        // 直接更新 DOM (速度极快)
        sheetRef.current.style.transform = `translateY(${rawTargetY}px)`;
        dragInfo.current.currentDy = delta;
    };

    const handleTouchEnd = () => {
        if (!sheetRef.current) return;
        dragInfo.current.isDragging = false;

        const dy = dragInfo.current.currentDy;
        const threshold = 60; // 触发吸附的阈值 (px)

        // 恢复平滑动画，用于吸附回弹
        sheetRef.current.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';

        // 吸附逻辑：根据拖拽方向和距离决定去哪个状态
        if (snapState === 'half') {
            if (dy < -threshold) {
                setSnapState('full'); // 向上拖 -> 全屏
            } else if (dy > threshold) {
                onClose(); // 向下拖 -> 关闭
            } else {
                // 距离不够，回弹到半开
                sheetRef.current.style.transform = `translateY(${metrics.halfOffset}px)`;
            }
        } else {
            // 当前是全屏状态
            if (dy > threshold) {
                setSnapState('half'); // 向下拖 -> 半开
            } else {
                // 回弹到 0 (严格的全屏位置)
                sheetRef.current.style.transform = `translateY(0px)`;
            }
        }

        dragInfo.current.currentDy = 0;
    };

    return (
        <>
            {/* 遮罩层 (Backdrop) */}
            <Box
                onClick={onClose}
                sx={{
                    position: 'fixed', inset: 0, bgcolor: 'rgba(0,0,0,0.5)', zIndex: 1200,
                    opacity: open ? 1 : 0,
                    pointerEvents: open ? 'auto' : 'none',
                    transition: 'opacity 0.3s'
                }}
            />
            {/* 弹窗容器 (Sheet Container) */}
            <Box
                ref={sheetRef}
                sx={{
                    position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1201,
                    bgcolor: '#fff',
                    borderTopLeftRadius: 20, borderTopRightRadius: 20,
                    height: `${metrics.full}px`,
                    boxShadow: '0px -4px 20px rgba(0,0,0,0.1)',
                    display: 'flex', flexDirection: 'column',
                    // 优化：告诉浏览器提升该元素为独立的渲染层 (GPU 加速)
                    willChange: 'transform'
                }}
            >
                {/* 1. 拖拽把手区 (Interaction Zone) */}
                <Box
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    sx={{
                        width: '100%', height: 48, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'grab', touchAction: 'none' // 阻止浏览器的默认滚动行为
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

                {/* 3. 内容滚动区 */}
                <Box sx={{
                    flex: 1,
                    overflowY: 'auto',
                    WebkitOverflowScrolling: 'touch', // 开启 iOS 原生滚动惯性
                    overscrollBehaviorY: 'contain',   // 防止滚动链传递给 body
                    pb: 'env(safe-area-inset-bottom)',
                    // 视觉保险：底部的额外填充 (虽然 V4 逻辑已经很稳，但加上更安全)
                    paddingBottom: '100px'
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

// --- 手风琴单项的数据结构 ---
// 🚩 1. 状态定义：增加 voteStatus 字段，用于存储点赞/点踩状态
interface AccordionItem {
    title: string;
    content: string;
    voteStatus?: 'none' | 'liked' | 'disliked'; // 新增字段
}

// 1. 数据结构：增加 options 字段 + 新增 accordions 字段
interface ChatTurn {
    user: string; // 如果为空字符串，表示是 AI 主动发起的（用户没说话）
    ai: string[] | null;
    options?: string[]; // 存放这一轮的“魔法卡片”选项，如果没有就是 undefined
    accordions?: AccordionItem[]; // <--- 新增字段：手风琴数据数组
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

// --- Mock 手风琴数据池 ---
const FIXED_ACCORDIONS: AccordionItem[] = [
    {
        title: "核心机制解析",
        content: "当受到致命伤害时，不会立即倒下，而是进入【维生状态】，持续10秒。期间攻击力提升30%。",
        voteStatus: 'none'
    },
    {
        title: "推荐配装思路",
        content: "武器首选【高频太刀】，圣遗物推荐【4件套：绝缘之旗印】。词条优先级：暴击率 > 暴击伤害 > 攻击力。",
        voteStatus: 'none'
    },
    {
        title: "BOSS 逃课打法",
        content: "不需要正面对决。只需要卡在左边的柱子后面，利用远程技能慢慢磨血即可。注意躲避二阶段的全屏落雷。",
        voteStatus: 'none'
    }
];

// 5. 开场白配置 🌟
const AI_GREETINGS = [
    "喵~这里是泛用型人工智能原型机TATA~",
    "你也可以叫我塔塔(｡･∀･)ﾉﾞ",
    "要不要一起来玩点游戏喵！"
];

// --- [关键组件]：AccordionCard (受控组件) ---
// 🚩 2. 组件改造：移除内部 useState，改为完全接收 props 和回调
// 这样可以确保 UI 状态和 history 数据保持一致
const AccordionCard = ({
                           data,
                           delay,
                           onVote
                       }: {
    data: AccordionItem,
    delay: string,
    onVote: (newStatus: 'liked' | 'disliked' | 'none') => void
}) => {

    // 直接使用数据源中的状态
    const currentVote = data.voteStatus || 'none';

    return (
        <Accordion
            disableGutters
            elevation={0}
            sx={{
                borderRadius: '16px !important',
                border: '1px solid #e0e0e0',
                bgcolor: '#ffffff',
                '&:before': { display: 'none' },
                overflow: 'hidden',
                animation: `fadeInUp 0.4s ease-out backwards`,
                animationDelay: delay,
                "@keyframes fadeInUp": {
                    "0%": { opacity: 0, transform: "translateY(10px)" },
                    "100%": { opacity: 1, transform: "translateY(0)" }
                }
            }}
        >
            <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#1976d2' }} />}
                sx={{
                    minHeight: 48,
                    '&.Mui-expanded': { minHeight: 48 },
                    px: 2,
                    '&:hover': { bgcolor: '#fafafa' }
                }}
            >
                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#424242' }}>
                    <span style={{ marginRight: 8 }}>📑</span>
                    {data.title}
                </Typography>
            </AccordionSummary>

            <AccordionDetails sx={{ bgcolor: '#f8f9fa', px: 2, pb: 1, pt: 1, borderTop: '1px solid #f0f0f0' }}>
                <Typography variant="body2" sx={{ color: '#616161', lineHeight: 1.6 }}>
                    {data.content}
                </Typography>

                {/* 操作按钮区 */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5, pt: 1, borderTop: '1px dashed #e0e0e0' }}>
                    {/* 点踩按钮 */}
                    <IconButton
                        size="small"
                        onClick={() => onVote(currentVote === 'disliked' ? 'none' : 'disliked')}
                        sx={{
                            color: currentVote === 'disliked' ? '#ef5350' : '#9e9e9e',
                            bgcolor: currentVote === 'disliked' ? '#ffebee' : 'transparent',
                            '&:hover': { color: '#ef5350', bgcolor: '#ffebee' },
                            transition: 'all 0.2s'
                        }}
                    >
                        {currentVote === 'disliked' ? <ThumbDownIcon fontSize="small" /> : <ThumbDownOutlinedIcon fontSize="small" />}
                    </IconButton>

                    {/* 点赞按钮 */}
                    <IconButton
                        size="small"
                        onClick={() => onVote(currentVote === 'liked' ? 'none' : 'liked')}
                        sx={{
                            color: currentVote === 'liked' ? '#1976d2' : '#9e9e9e',
                            bgcolor: currentVote === 'liked' ? '#e3f2fd' : 'transparent',
                            '&:hover': { color: '#1976d2', bgcolor: '#e3f2fd' },
                            transition: 'all 0.2s'
                        }}
                    >
                        {currentVote === 'liked' ? <ThumbUpIcon fontSize="small" /> : <ThumbUpOutlinedIcon fontSize="small" />}
                    </IconButton>
                </Box>
            </AccordionDetails>
        </Accordion>
    );
};

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
        // [新增] 如果正在等待回复，禁止点击选项
        if (isSending) return;

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

    // 🚩 3. 核心逻辑：处理手风琴投票并存入 History
    const handleAccordionVote = (turnIndex: number, accordionIndex: number, newStatus: 'liked' | 'disliked' | 'none') => {

        // 可选：在这里发送 API 请求
        console.log(`[数据存入 History] Turn: ${turnIndex}, Card: ${accordionIndex}, NewStatus: ${newStatus}`);

        // 使用不可变数据模式更新 history
        setHistory(prev => {
            const newHistory = [...prev];
            const targetTurn = newHistory[turnIndex];

            if (targetTurn && targetTurn.accordions) {
                // 深拷贝数组，防止引用污染
                const newAccordions = [...targetTurn.accordions];
                // 更新指定卡片的状态
                newAccordions[accordionIndex] = {
                    ...newAccordions[accordionIndex],
                    voteStatus: newStatus
                };

                newHistory[turnIndex] = {
                    ...targetTurn,
                    accordions: newAccordions
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

                // 3. [新增] 手风琴触发检查 (包含这些词就触发，方便测试)
                const isAccordionMatch = randomResponse.some(line => {
                    // 定义一个关键词数组，只要命中其中任何一个就触发
                    const keywords = ["知识盲区", "有趣", "哈哈","另一个角度"];
                    return keywords.some(key => line.includes(key));
                });

                setHistory(prev => {
                    const newHistory = [...prev];
                    const index = newHistory.length - 1;

                    // 🚩 4. 关键点：生成数据时必须 Deep Copy
                    // 如果直接引用 FIXED_ACCORDIONS，那么修改一个历史卡片会影响所有卡片
                    const safeAccordions = isAccordionMatch
                        ? FIXED_ACCORDIONS.map(item => ({ ...item, voteStatus: 'none' as const }))
                        : undefined;

                    newHistory[index] = {
                        ...newHistory[index],
                        ai: randomResponse,
                        // 4. ⚖️ 条件分发：只有对上了暗号，才给 FIXED_OPTIONS，否则是 undefined
                        options: isTriggerMatch ? FIXED_OPTIONS : undefined,
                        accordions: safeAccordions
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

        const lastTurn = history[history.length - 1];

        // 1. 自动滚动逻辑
        if (userStackMode === "bottom") {
            // 稍微延迟一点滚动，确保 DOM 已经渲染了新的高度
            requestAnimationFrame(() => {
                listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
            });
        } else if (userStackMode === "top" && isSending && latestTurnRef.current) {
            latestTurnRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }

        // [核心修复]：只有当 AI 确实回复了（ai 不为 null），才解除锁定状态
        if (lastTurn.ai !== null) {
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
                                            whiteSpace: "pre-wrap" // [新增] 允许用户输入换行显示
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

                                        {/* --- 新增：手风琴卡片渲染区 --- */}
                                        {turn.accordions && turn.accordions.length > 0 && (
                                            <Box sx={{
                                                mt: 1.5,
                                                maxWidth: '90%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 1
                                            }}>
                                                {turn.accordions.map((acc, accIdx) => (
                                                    <AccordionCard
                                                        key={accIdx}
                                                        data={acc}
                                                        delay={`${accIdx * 0.1}s`}
                                                        // 传递回调：修改 history 的状态
                                                        onVote={(status) => handleAccordionVote(i, accIdx, status)}
                                                    />
                                                ))}
                                            </Box>
                                        )}

                                        {/* --- 魔法卡片区域 --- */}
                                        {turn.options && turn.options.length > 0 && (
                                            <Box
                                                sx={{
                                                    mt: 1.5,
                                                    display: "flex",
                                                    flexWrap: "wrap",
                                                    justifyContent: "flex-end",
                                                    gap: 1.2,
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
                                                            borderRadius: "24px",
                                                            border: "1px solid #e0e0e0",
                                                            backgroundColor: "#ffffff",
                                                            color: "#424242",
                                                            textTransform: "none",
                                                            fontSize: "0.875rem",
                                                            fontWeight: 500,
                                                            padding: "6px 16px",
                                                            boxShadow: "0px 1px 2px rgba(0,0,0,0.05)",
                                                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                                            animation: `fadeInUp 0.4s ease-out backwards`,
                                                            animationDelay: `${optIndex * 0.05}s`,
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
                {/* [布局重构]:
                   1. display: "block" (position: relative) 代替 flex，以便绝对定位按钮
                   2. 移除 gap，通过 padding 控制间距
                */}
                <Box sx={{ position: "relative", backgroundColor: "#f0f4f9", p: 1, borderRadius: "28px" }}>
                    <TextField
                        fullWidth
                        placeholder={isSending ? "TATA 正在思考中..." : "说点什么喵~"}
                        variant="standard"
                        multiline
                        maxRows={4}
                        InputProps={{
                            disableUnderline: true,
                            sx: {
                                px: 2,
                                // 如果正在发送，将输入框文字变淡
                                color: isSending ? '#bdbdbd' : 'inherit',

                                // [核心 CSS]: 针对内部的 textarea 进行样式覆盖
                                "& textarea": {
                                    // 1. 让右侧文字留出空间，不要被绝对定位的按钮遮挡
                                    paddingRight: "88px !important",

                                    // 2. 自定义滚动条样式，使其位于最右侧，但底部悬空
                                    "&::-webkit-scrollbar": {
                                        width: "4px",
                                    },
                                    "&::-webkit-scrollbar-thumb": {
                                        backgroundColor: "#bdbdbd",
                                        borderRadius: "2px"
                                    },
                                    // [Magical Logic]:
                                    // 轨道底部增加 margin，高度等于按钮高度 (36px) + 间距。
                                    // 这样滚动条就会在按钮上方停止，不会穿过按钮。
                                    "&::-webkit-scrollbar-track": {
                                        marginBottom: "40px"
                                    }
                                }
                            }
                        }}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        // [修改] 移除了 onKeyDown 监听 Enter 发送的逻辑，现在 Enter 默认换行
                    />
                    <Button
                        variant="contained"
                        // [修改] 如果正在发送，禁止点击
                        onClick={() => {
                            if (!isSending) handleSend(inputValue);
                        }}
                        sx={{
                            // [布局重构]: 绝对定位，吸附在右下角
                            position: "absolute",
                            bottom: "6px", // 贴着容器底部 padding
                            right: "8px",  // 贴着容器右侧 padding
                            height: "36px", // [需求1]: 固定高度，不随文字伸缩

                            borderRadius: "20px",
                            transition: "all 0.3s ease",

                            // [新增] 动态样式：如果正在发送，应用 AI 炫彩流光效果
                            ...(isSending ? {
                                background: "linear-gradient(120deg, #2196f3, #9c27b0, #ff4081, #2196f3)",
                                backgroundSize: "300% 300%",
                                animation: "ai-flow 3s ease infinite",
                                boxShadow: "0 0 15px rgba(156, 39, 176, 0.4)",
                                border: "none",
                                color: "white",
                                pointerEvents: "none", // 物理禁用点击
                                opacity: 0.9,
                                "@keyframes ai-flow": {
                                    "0%": { backgroundPosition: "0% 50%" },
                                    "50%": { backgroundPosition: "100% 50%" },
                                    "100%": { backgroundPosition: "0% 50%" }
                                }
                            } : {
                                // 正常样式
                                bgcolor: "#1976d2",
                                '&:hover': { bgcolor: "#1565c0" }
                            })
                        }}
                    >
                        {isSending ? "思考中" : "发送"}
                    </Button>
                </Box>
            </Box>

            {/* --- 历史弹窗 --- */}
            <HistoryBottomSheet
                open={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />

        </Box>
    );
}