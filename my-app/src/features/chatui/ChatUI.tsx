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

export default function ChatUI({ userStackMode = "bottom" }: ChatUIProps) {
    const [inputValue, setInputValue] = useState("");
    const [messages, setMessages] = useState<string[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [containerHeight, setContainerHeight] = useState(0);

    const listRef = useRef<HTMLDivElement>(null);
    const latestMessageRef = useRef<HTMLDivElement>(null);

    const handleSend = () => {
        if (inputValue.trim() === "") return;
        setMessages((prev) => [...prev, inputValue]);
        setInputValue("");
        setIsSending(true);
    };

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

    useEffect(() => {
        if (messages.length === 0) return;

        if (userStackMode === "bottom") {
            listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
            setIsSending(false);
            return;
        }

        if (userStackMode === "top" && isSending && latestMessageRef.current) {
            latestMessageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
            setIsSending(false);
        }
    }, [messages, isSending, userStackMode]);

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
                {/* 顶部的垫片保留，用于历史消息的顶部缓冲 */}
                <Box sx={{ height: 20 }} />

                {messages.map((msg, i) => {
                    const isLast = i === messages.length - 1;
                    const minHeightStyle = (userStackMode === "top" && isLast && containerHeight > 0)
                        ? `${containerHeight}px`
                        : "auto";

                    return (
                        <Box
                            key={i}
                            ref={isLast ? latestMessageRef : null}
                            sx={{
                                minHeight: minHeightStyle,
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "flex-start",
                                mb: isLast ? 0 : 3,
                                transition: "min-height 0.3s",

                                // ⭐⭐⭐ 关键修改点在这里 ⭐⭐⭐
                                // 1. boxSizing: 'border-box' 确保 padding 不会撑大高度导致滚动条复活
                                boxSizing: 'border-box',

                                // 2. 给最后一条消息加 padding-top (比如 40px)
                                // 这样 scrollIntoView 虽然对齐了顶部，但气泡会乖乖待在下面一点的位置
                                pt: (userStackMode === "top" && isLast) ? 2 : 0,
                                pb: (userStackMode === "bottom" && isLast) ? 2 : 0,
                            }}
                        >
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
                                    {msg}
                                </Box>
                            </Box>

                            {userStackMode === "top" && isLast && (
                                <Box sx={{ mt: 2, ml: 1, opacity: 0.5 }}>
                                    <Typography variant="caption" color="text.secondary">
                                        (等待 AI 回复...)
                                    </Typography>
                                </Box>
                            )}
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