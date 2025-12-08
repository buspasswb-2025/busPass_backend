

function sockethandler(io, socket) {
    socket.on("joinTrip", (tripId) => {
        socket.join(tripId);
        console.log(`User ${socket.id} joined trip ${tripId}`);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
}


export default sockethandler;