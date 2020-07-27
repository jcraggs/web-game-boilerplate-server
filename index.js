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

    // Record the room + number of clients when the game started and set the game starting to true
    getNoOfPlayersOnGameStart();
    async function getNoOfPlayersOnGameStart() {
      let noOfPlayersOnStart = new Promise((res, rej) => {
        io.of("/")
          .in(gameStatusInfo.room)
          .clients((error, clients) => {
            let playersInRoom = clients;
            res(playersInRoom);
          });
      });
      gameStatusInfo.noOfClientsAtGameStart = await noOfPlayersOnStart;
    }

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
      limitTotalUsersPerRoom(gameStatusInfo.noOfClientsAtGameStart.length);
    } else limitTotalUsersPerRoom(limit);

    async function limitTotalUsersPerRoom(limit) {
      const limitUsers = await io.in(room).clients((err, clients) => {
        let currentUsers = clients.length + 1;

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

            gameStatusInfo.currentUsers = currentUsers;
            gameStatusInfo.room = room;

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
    async function getPlayersLeftInLobby() {
      let playersLeftPromise = new Promise((res, rej) => {
        io.of("/")
          .in(gameStatusInfo.room)
          .clients((error, clients) => {
            let remainingPlayers = clients;
            res(remainingPlayers);
          });
      });

      let usersConnected = await playersLeftPromise;

      if (
        usersConnected.length < gameStatusInfo.noOfClientsAtGameStart.length &&
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
        gameStatusInfo.noOfClientsAtGameStart = undefined;
      }
      return;
    }

    // This if statement works out if a disconnect is from an in-game player or from
    // a player who tried to join when the game was in progress/ lobby was full
    if (
      gameStatusInfo.gameHasStarted === true &&
      gameStatusInfo.currentUsers ===
        gameStatusInfo.noOfClientsAtGameStart.length &&
      gameStatusInfo.noOfClientsAtGameStart !== undefined
    ) {
      getPlayersLeftInLobby();
    }

    const user = removeUser(socket.id);

    if (user !== undefined) {
      io.to(user.room).emit("message", {
        user: "server",
        text: `${user.name} has left the room`,
      });

      io.to(user.room).emit("gameData", {
        gameStarted: false,
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
