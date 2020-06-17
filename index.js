const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const cors = require("cors");

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
  readyUser,
} = require("./users");

const PORT = process.env.PORT || 5000;

const router = require("./router");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(router);
app.use(cors());

io.on("connect", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    // Edit the number below to change the limit of users per room
    limit = 10;
    limitTotalUsersPerRoom(limit);

    async function limitTotalUsersPerRoom(limit) {
      const limitUsers = await io.in(room).clients((err, clients) => {
        let currentUsers = clients.length + 1;

        if (currentUsers > limit) {
          socket.emit("roomFull");
        } else {
          socket.emit("allowEntry", true);
          const { error, user } = addUser({ id: socket.id, name, room, limit });

          if (error) return callback(error);
          else {
            socket.emit("message", {
              user: "server",
              text: `Hi ${user.name}, welcome to the room "${user.room}"`,
            });

            socket.broadcast.to(user.room).emit("message", {
              user: "server",
              text: `${user.name} has joined the room`,
            });

            socket.join(user.room);

            io.to(user.room).emit("roomData", {
              room: user.room,
              users: getUsersInRoom(user.room),
            });

            callback();
          }
        }
      });
    }
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    if (user !== undefined) {
      io.to(user.room).emit("message", { user: user.name, text: message });
    }

    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user !== undefined) {
      io.to(user.room).emit("message", {
        user: "server",
        text: `${user.name} has left the room`,
      });

      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });

  socket.on("readyPlayer", (name, currentUsersList) => {
    let userToReady = readyUser(socket.id, currentUsersList);
    const user = getUser(socket.id);
    if (userToReady !== undefined) {
      if (user !== undefined) {
        io.to(user.room).emit("roomData", {
          room: user.room,
          users: userToReady,
        });
      }
    }
  });

  socket.on("startGame", () => {
    const user = getUser(socket.id);
    if (user !== undefined) {
      io.to(user.room).emit("gameData", {
        gameStarted: true,
      });
    }
  });
});

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));
