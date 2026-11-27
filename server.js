const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// public folder ထဲက index.html နှင့် ပုံများကို ပြသရန်
app.use(express.static(path.join(__dirname, 'public')));

let tiktokConnection = null;

io.on('connection', (socket) => {
    console.log('Client connected');

    // Frontend မှ @username ဖြင့် လာချိတ်သည့်အခါ
    socket.on('connect-tiktok', (username) => {
        if (tiktokConnection) {
            tiktokConnection.disconnect();
        }

        const cleanUsername = username.replace('@', '').trim();
        tiktokConnection = new WebcastPushConnection(cleanUsername);

        tiktokConnection.connect().then(state => {
            socket.emit('status', { connected: true, message: `@${cleanUsername} နှင့် ချိတ်ဆက်ပြီးပါပြီ!` });
        }).catch(err => {
            socket.emit('status', { connected: false, message: `ချိတ်ဆက်မရပါ: ${err.message} (Live လွှင့်နေမှသာ ချိတ်နိုင်ပါသည်)` });
        });

        // Comment ဝင်လာလျှင်
        tiktokConnection.on('chat', data => {
            io.emit('tiktok-chat', {
                user: data.nickname,
                avatar: data.profilePictureUrl,
                comment: data.comment
            });
        });

        // Gift ပို့လာလျှင်
        tiktokConnection.on('gift', data => {
            // Streak Gift (ဆက်တိုက်ပို့နေဆဲ) မဟုတ်ဘဲ ပြီးဆုံးမှ (သို့) တစ်ခုချင်းဆိုလျှင် ပြရန်
            if (data.giftType === 1 && !data.repeatEnd) return;

            io.emit('tiktok-gift', {
                user: data.nickname,
                avatar: data.profilePictureUrl,
                giftName: data.giftName,
                giftCount: data.repeatCount,
                giftIcon: data.giftPictureUrl
            });
        });

        // Like နှိပ်လာလျှင်
        tiktokConnection.on('like', data => {
            io.emit('tiktok-like', {
                user: data.nickname,
                count: data.likeCount
            });
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});