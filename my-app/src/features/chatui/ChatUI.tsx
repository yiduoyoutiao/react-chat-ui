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
                height: "100vh",
                display: "flex",
                flexDirection: "column",
                p: 0,
            }}
        >
            {/* 标题 */}
            <Typography variant="h6" sx={{ p: 2, pb: 1 }}>
                ✧Chat UI✧
            </Typography>

            {/* 聊天记录区域 */}
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
                            justifyContent: "flex-end", // 右对齐！
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

            {/* 底部输入栏 */}
            <Box
                sx={{
                    p: 2,
                    display: "flex",
                    gap: 2,
                    borderTop: "1px solid #ddd",
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
