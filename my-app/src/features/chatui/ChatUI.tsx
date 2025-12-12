import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
    Box,
    Button,
    TextField,
    Paper,
    Typography,
    Chip,
} from "@mui/material";

interface ChatUIProps {
    userStackMode?: "bottom" | "top";
}

// 1. 修改数据结构：增加 options 字段
interface ChatTurn {
    user: string;
    ai: string[] | null;
    options?: string[]; // 存放这一轮的“魔法卡片”选项，如果没有就是 undefined
}

// 2. 定义一个随机回复池 (模拟 AI 生成的不同长度内容)
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

// 3. 定义固定的测试选项
const FIXED_OPTIONS = [
    "明日方舟",
    "原神",
    "埃尔登法环",
    "崩坏:星穹铁道",
    "光与影:33号远征队",
    "空洞骑士:丝之歌",
    "重返1999",
    "CSGO",
    "英雄联盟",
    "其他游戏",
];

export default function ChatUI({ userStackMode = "top" }: ChatUIProps) {
    const [inputValue, setInputValue] = useState("");
    const [history, setHistory] = useState<ChatTurn[]>([]);
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
                // 1. 先抽取这次要回复的内容
                const randomResponse = AI_REPLY_POOL[Math.floor(Math.random() * AI_REPLY_POOL.length)];

                // 2. 🔮 魔法判断：检查这次回复里有没有包含那句“咒语”
                // 注意：randomResponse 是一个字符串数组，所以我们用 includes 来查找
                const isTriggerMatch =
                    randomResponse.includes("话说你喜欢什么游戏呀要不要一起玩~") ||
                    randomResponse.includes("别想那么多，要不一起玩点游戏(｡･∀･)ﾉﾞ") ||
                    randomResponse.includes("那么可以陪我玩游戏了吗~");

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
            <Typography variant="h6" sx={{ p: 2, borderBottom: "1px solid #eee" }}>
                ✧ Chat UI ✧
            </Typography>

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
                <Box sx={{ height: 20 }} />

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
                                pt: (userStackMode === "top" && isLast) ? 2 : 0,
                                pb: (userStackMode === "bottom" && isLast) ? 2 : 0,
                            }}
                        >
                            {/* --- 用户消息 --- */}
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

                            {/* --- AI 回复区域 --- */}
                            <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
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

                                                            "&:hover": {
                                                                backgroundColor: "#f0f7ff", // 悬停时变成淡淡的宝石蓝背景
                                                                borderColor: "#80d8ff", // 边框也亮起来
                                                                color: "#0277bd", // 文字变蓝
                                                                transform: "translateY(-2px)", // 轻轻上浮，体现“失重感”
                                                                boxShadow: "0px 4px 8px rgba(2, 119, 189, 0.15)", // 投影加深，像浮起来了
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
                                                ✧ AI 正在编造敷衍回答...
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
        </Box>
    );
}