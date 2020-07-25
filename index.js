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

// Reference object used to determine the state of the game on join
gameStatusInfo = {};

// Edit the number below to change the default limit of users per room
limit = 4;

io.on("connect", (socket) => {
  socket.on("startGame", ({ room }) => {
    const user = getUser(socket.id);

    // Set the number of clients and the game starting to true
    gameStatusInfo.currentNumberOfClients = io.in(
      room
    ).server.engine.clientsCount;
    gameStatusInfo.gameHasStarted = true;
    gameStatusInfo.room = room;

    if (user !== undefined) {
      io.to(user.room).emit("gameData", {
        gameStarted: true,
      });
    }
  });

  socket.on("join", ({ name, room }, callback) => {
    // Stops extra users joining once a game has started
    if (gameStatusInfo.gameHasStarted === true) {
      limitTotalUsersPerRoom(gameStatusInfo.currentNumberOfClients);
    } else limitTotalUsersPerRoom(limit);

    async function limitTotalUsersPerRoom(limit) {
      const limitUsers = await io.in(room).clients((err, clients) => {
        let currentUsers = clients.length + 1;

        gameStatusInfo.currentUsers = currentUsers;
        gameStatusInfo.room = room;

        // Blocks entry if room is full
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
    // Sends everyone back to the lobby if someone quits mid game
    console.log(gameStatusInfo);

    async function firstAsync() {
      let promise = new Promise((res, rej) => {
        io.of("/")
          .in(gameStatusInfo.room)
          .clients((error, clients) => {
            let var123 = clients;
            console.log("doing the io stuff");
            res(var123);
          });
      });

      // wait until the promise returns us a value
      let usersConnected = await promise;

      console.log(usersConnected);
      console.log("UC length: " + usersConnected.length);
      console.log("C users: " + gameStatusInfo.currentUsers);
      console.log("cnoc: " + gameStatusInfo.currentNumberOfClients);

      if (
        usersConnected.length < gameStatusInfo.currentNumberOfClients &&
        gameStatusInfo.currentUsers > 0
      ) {
        const user = getUser(socket.id);

        if (user !== undefined) {
          io.to(gameStatusInfo.room).emit("gameData", {
            gameStarted: false,
            returnReason: `${user.name} left the game.`,
          });
        } else {
          io.to(gameStatusInfo.room).emit("gameData", {
            gameStarted: false,
            returnReason: `player left the game.`,
          });
        }
        gameStatusInfo.currentUsers -= 1;
        gameStatusInfo.gameHasStarted = false;
        gameStatusInfo.currentNumberOfClients -= 1;
      }

      return;
    }

    if (gameStatusInfo.gameHasStarted === true) {
      firstAsync();
    }

    // OLD CODE

    // if (
    //   gameStatusInfo.currentUsers === gameStatusInfo.currentNumberOfClients &&
    //   gameStatusInfo.currentUsers > 0
    // ) {
    //   const user = getUser(socket.id);

    //   if (user !== undefined) {
    //     io.to(gameStatusInfo.room).emit("gameData", {
    //       gameStarted: false,
    //       returnReason: `${user.name} left the game.`,
    //     });
    //   } else {
    //     io.to(gameStatusInfo.room).emit("gameData", {
    //       gameStarted: false,
    //       returnReason: `player left the game.`,
    //     });
    //   }
    //   gameStatusInfo.currentUsers -= 1;
    //   gameStatusInfo.gameHasStarted = false;
    //   gameStatusInfo.currentNumberOfClients -= 1;
    // }

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
});

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));
