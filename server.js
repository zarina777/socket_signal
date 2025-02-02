const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const userRoute = require("./users/users");
const PORT = process.env.PORT || 5050;
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  })
);

// Socket.io setup
const server = require("http").createServer(app); // Attach HTTP server to app
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const connectedUsers = new Map();

// Handle Socket.IO connections
io.on("connection", (socket) => {
  // Authenticate user and map their _id to their socket
  socket.on("authenticate", (userId) => {
    connectedUsers.set(userId, { currentID: socket.id, busy: false });
    console.log(`User authenticated: ${userId}`);
  });

  // Handle incoming call requests
  socket.on("callUser", ({ userToCall, signal, from, name }) => {
    let targetUser = connectedUsers.get(userToCall);
    let currentUser = connectedUsers.get(from);
    if (targetUser) {
      if (targetUser.busy) {
        socket.emit("busyUser", "User is currently busy");
        return;
      }
      io.to(targetUser.currentID).emit("callUser", { signal, name, from, userToCall });
      connectedUsers.set(from, { ...currentUser, busy: true });
    } else {
      socket.emit("UserNotOnline", "User is not online");
    }
  });
  socket.on("denyCall", ({ from, name, to }) => {
    let targetUser = connectedUsers.get(to);
    let currentUser = connectedUsers.get(from);
    if (targetUser && currentUser) {
      socket.to(targetUser?.currentID).emit("callDenied", { from, name, to });
      connectedUsers.set(from, { ...targetUser, busy: false });
    }
  });

  // Handle response to incoming call
  socket.on("answerToCall", (data) => {
    let targetUser = connectedUsers.get(data.to);
    let callingUser = connectedUsers.get(data.from);

    if (targetUser && callingUser) {
      io.to(targetUser.currentID).emit("callAccepted", data.signal);

      // Update busy status for both users
      connectedUsers.set(data.to, { ...targetUser, busy: true });
      connectedUsers.set(data.from, { ...callingUser, busy: true });
    } else {
      console.log(`User ${data.to} or ${data.from} is not connected`);
    }
  });

  // Handle ending the call
  socket.on("endCall", ({ to, from }) => {
    console.log(to);
    let targetUser = connectedUsers.get(to);
    let callingUser = connectedUsers.get(from);
    console.log(`User ${to} - ${from}`);
    if (targetUser && callingUser) {
      io.to(targetUser.currentID).emit("endCall", { from, to });
      connectedUsers.set(to, { ...targetUser, busy: false });
      connectedUsers.set(from, { ...callingUser, busy: false });
    }
    // Update busy status for both users
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    for (const [userId, userInfo] of connectedUsers.entries()) {
      if (userInfo.currentID === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User disconnected: ${userId}`);
        io.emit("userOffline", userId);
        break;
      }
    }
  });
});
// API routes
app.use("/users", userRoute);

mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("Successfully connected to db"))
  .then(() => {
    server.listen(PORT, () => {
      // Use `server.listen` instead of `app.listen`
      console.log("Server is running on port:", PORT);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to database:", error.message);
  });
