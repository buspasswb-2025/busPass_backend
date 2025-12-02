import 'dotenv/config';
import app from "./app.js";
import connectToDB from './config/dbConfig.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { handleSocketConnection } from './socket/socketHandler.js';


const PORT = process.env.PORT || 5003;

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true
    }
})


io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);
    handleSocketConnection(io, socket);
});

export {io};

server.listen(PORT, async () => {
    await connectToDB();
    console.log(`server is running at http://localhost:${PORT}`);
})