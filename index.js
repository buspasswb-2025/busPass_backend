import 'dotenv/config';
import app from "./app.js";
import connectToDB from './config/dbConfig.js';
import { createServer } from 'http';
import { Server } from 'socket.io';


const PORT = process.env.PORT || 5003;

const server = createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true
    }
})

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Client joins a trip room
  socket.on("joinTrip", (tripId) => {
    socket.join(tripId);
    console.log(`User ${socket.id} joined trip ${tripId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

export {io};

server.listen(PORT, async () => {
    await connectToDB();
    console.log(`server is running at http://localhost:${PORT}`);
})