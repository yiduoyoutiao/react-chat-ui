import React, { useState, useRef, useEffect } from "react";
import {
    Box,
    Button,
    TextField,
    Paper,
    Typography,
} from "@mui/material";

export default function ChatUI() {
    const [inputValue, setInputValue] = useState("");
    const [messages, setMessages] = useState<string[]>([]);
    const listRef = useRef<HTMLDivElement>(null);

    const handleSend = () => {
        if (inputValue.trim() === "") return;
        setMessages((prev) => [...prev, inputValue]);
        setInputValue("");
    };

    // 自动滚动到底部
    useEffect(() => {
        listRef.current?.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages]);

    return (
        <Box
            sx={{
                height: "100dvh", // iOS Safari 适配关键
                display: "flex",
                flexDirection: "column",
                backgroundColor: "#ffffff",
            }}
        >
            {/* 顶部标题 */}
            <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
                ✧Chat UI✧
            </Typography>

            {/* 聊天内容区域 */}
            <Paper
                ref={listRef}
                sx={{
                    flex: 1,
                    overflowY: "auto",
                    p: 2,
                    backgroundColor: "#ffffff",
                }}
            >
                {messages.map((msg, i) => (
                    <Box
                        key={i}
                        sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            mb: 1.5,
                        }}
                    >
                        <Box
                            sx={{
                                backgroundColor: "#90caf9",
                                color: "#fff",
                                px: 2,
                                py: 1,
                                borderRadius: "12px",
                                maxWidth: "70%",
                                boxShadow: 1,
                                wordBreak: "break-word",
                            }}
                        >
                            {msg}
                        </Box>
                    </Box>
                ))}
            </Paper>

            {/* 底部输入框区域 */}
            <Box
                sx={{
                    p: 2,
                    pb: "calc(env(safe-area-inset-bottom) + 16px)", // iPhone 底部安全区
                    display: "flex",
                    gap: 2,
                    borderTop: "1px solid #ddd",
                    backgroundColor: "#ffffff",

                    position: "sticky",
                    bottom: 0,
                    zIndex: 10,
                }}
            >
                <TextField
                    fullWidth
                    label="说点什么吧～"
                    variant="outlined"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                <Button variant="contained" onClick={handleSend}>
                    发送
                </Button>
            </Box>
        </Box>
    );
}
