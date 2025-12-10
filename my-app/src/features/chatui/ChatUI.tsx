import React from 'react';
import { Button, Box, Typography } from '@mui/material';
import { TextField } from '@mui/material';

export default function ChatUI() {
    return (
        <Box sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom>
                Hello from ChatUI!
            </Typography>
            <Button variant="contained" color="primary">
                点我喵喵喵！
            </Button>
            <TextField  sx={{ mt: 2 }} label="说点什么喵～" variant="outlined" />
        </Box>
    );
}
