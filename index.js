import 'dotenv/config';
import app from "./app.js";
import connectToDB from './config/dbConfig.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import sockethandler from './socket/socketHandler.js';


const PORT = process.env.PORT || 5003;

const server = createServer(app);

const io = new Server(server, {
    cors: {
         origin: ["http://localhost:8100","https://localhost"],
        credentials: true
    }
})

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  sockethandler(io, socket);  
});

export {io};

server.listen(PORT, async () => {
    await connectToDB();
    console.log(`server is running at http://localhost:${PORT}`);
})