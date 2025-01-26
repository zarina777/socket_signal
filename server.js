const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();
const userRoute = require("./users/users");
const PORT = process.env.PORT || 5050;
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cors());

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
  // Authenticate user and map their `_id` to their socket
  socket.on("authenticate", (userId) => {
    connectedUsers.set(userId, socket.id);
    console.log(`User authenticated: ${userId}`);
  });

  // CallUser
  socket.on("callUser", ({ userToCall, signal, from, name }) => {
    let targetUser = connectedUsers.get(userToCall);
    if (targetUser) {
      io.to(targetUser).emit("callUser", { signal: signal, from, name });
      socket.emit("UserIsOnline", "User is online, Wait for response...");
    } else {
      socket.emit("UserNotOnline", "User is not online");
    }
  });

  socket.on("answerToCall", (data) => {
    let targetUser = connectedUsers.get(data.to);
    if (targetUser) {
      io.to(targetUser).emit("callAccepted", data.signal); // Send the accepted signal to the caller
    } else {
      console.log(`User ${data.to} is not connected`);
    }
  });

  socket.on("disconnect", () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`User disconnected: ${userId}`);
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
