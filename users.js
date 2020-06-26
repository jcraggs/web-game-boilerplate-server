let users = [];

const addUser = ({ id, name, room, limit }) => {
  name = name.trim().toLowerCase();
  room = room.trim().toLowerCase();

  const existingUser = users.find(
    (user) => user.room === room && user.name === name
  );

  if (name.length > 10 || room.length > 10)
    return {
      error: {
        msg: "Names and rooms can only be max 10 characters",
        status: 401,
      },
    };

  if (!name || !room) return { error: "Name and room are required." };
  if (existingUser) return { error: `Name "${name}" is taken.` };

  const user = { id, name, room, ready: false, roomSizeLimit: limit };

  users.push(user);

  return { user };
};

const removeUser = (id) => {
  const index = users.findIndex((user) => user.id === id);

  if (index !== -1) return users.splice(index, 1)[0];
};

const getUser = (id) => users.find((user) => user.id === id);

const getUsersInRoom = (room) => {
  return users.filter((user) => user.room === room);
};

const readyUser = (id, currentUserList) => {
  const userArr = currentUserList;
  const index = userArr.findIndex((user) => user.id === id);

  let updatedArray = [];

  for (let i = 0; i < userArr.length; i++) {
    if (i !== index) {
      updatedArray.push(userArr[i]);
    }
    if (i === index) {
      const userRef = userArr[index];
      const readiedUser = {
        id: userRef.id,
        name: userRef.name,
        room: userRef.room,
        ready: !userRef.ready,
        roomSizeLimit: userRef.roomSizeLimit,
      };
      updatedArray.push(readiedUser);
    }
  }

  users = updatedArray;

  return updatedArray;
};

module.exports = { addUser, removeUser, getUser, getUsersInRoom, readyUser };
