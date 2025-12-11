import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
    Box,
    Button,
    TextField,
    Paper,
    Typography,
} from "@mui/material";

interface ChatUIProps {
    userStackMode?: "bottom" | "top";
}

// 1. 修改数据结构：ai 变成字符串数组，支持多段落堆叠
interface ChatTurn {
    user: string;
    ai: string[] | null; // null: 思考中; string[]: 回复内容列表
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
];

export default function ChatUI({ userStackMode = "top" }: ChatUIProps) {
    const [inputValue, setInputValue] = useState("");
    const [history, setHistory] = useState<ChatTurn[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [containerHeight, setContainerHeight] = useState(0);

    const listRef = useRef<HTMLDivElement>(null);
    const latestTurnRef = useRef<HTMLDivElement>(null);

    const handleSend = () => {
        if (inputValue.trim() === "") return;

        setHistory((prev) => [...prev, { user: inputValue, ai: null }]);
        setInputValue("");
        setIsSending(true);
    };

    // 监听历史记录，模拟 AI 回复
    useEffect(() => {
        if (history.length === 0) return;

        const lastTurn = history[history.length - 1];

        // 如果最后一条是用户刚发的，且 AI 还没回
        if (lastTurn.ai === null) {
            // 随机生成延迟时间 (800ms - 2000ms)，让思考感更真实
            const randomDelay = Math.floor(Math.random() * 1200) + 800;

            const timer = setTimeout(() => {
                // 3. 随机抽取一个回复
                const randomResponse = AI_REPLY_POOL[Math.floor(Math.random() * AI_REPLY_POOL.length)];

                setHistory(prev => {
                    const newHistory = [...prev];
                    const index = newHistory.length - 1;
                    newHistory[index] = {
                        ...newHistory[index],
                        ai: randomResponse // 填入数组
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
                                    // 4. 遍历渲染每一段回复
                                    turn.ai.map((line, idx) => (
                                        <Box
                                            key={idx}
                                            sx={{
                                                display: "flex",
                                                justifyContent: "flex-start",
                                                animation: "fadeIn 0.5s ease-in forwards", // 简单的淡入动画
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
                                    ))
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
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    />
                    <Button variant="contained" onClick={handleSend} sx={{ borderRadius: "20px" }}>发送</Button>
                </Box>
            </Box>
        </Box>
    );
}