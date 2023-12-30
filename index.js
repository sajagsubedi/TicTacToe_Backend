import http from "http";
import express from "express";
import { Server } from "socket.io";
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.ORIGIN
    }
});
const rooms = new Map(); // To store game rooms

io.on("connection", socket => {
    socket.on("createGame", data => {
        const { name, weapon, password } = data;
        const players = [{ name, weapon, id: socket.id }];
        rooms.set(password, players);
        socket.join(password);        
        socket.emit("gameCreated", {
            roomPassword: password,
            players
        });
    });

    socket.on("joinGame", data => {
        const { name, password } = data;
        if (rooms.has(password)) {
            let room = rooms.get(password);
            if (room.length < 2) {
                let myWeapon = room[0].weapon == "O" ? "X" : "O";
                room.push({ name: name, weapon: myWeapon, id: socket.id });
                socket.join(password);
                socket.emit("joinedGame", {
                    roomPassword: password,
                    users: room,
                    name,
                    id: socket.id,
                    weapon: myWeapon
                });
                io.to(password).emit("opponentJoined", room);
            } else {
                socket.emit("roomFull");
            }
        } else {
            socket.emit("roomNotFound");
        }
    });
    socket.on("moved", data => {
        const { roomPassword, gmData, myId } = data;
        const room = rooms.get(roomPassword);
        let to = "";
        if (room[0].id == myId) {
            to = room[1].id;
        } else {
            to = room[0].id;
        }
        io.to(roomPassword).emit("opponentPlay", { to, gmData });
    });

    socket.on("restart", ({ roomPassword, myId, myTurn }) => {
        let sendData = {
            turn: ""
        };
        const room = rooms.get(roomPassword);
        if (myTurn == true) {
            sendData.turn = room[0].id == myId ? room[1].id : room[0].id;
        } else {
            sendData.turn = myId;
        }
        console.log(room)
        console.log(sendData)
        io.to(roomPassword).emit("restart", sendData);
    });
    socket.on("leavegame", data => {
        io.to(data).emit("opponentLeft");
        rooms.delete(data);
    });
    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});
const PORT=process.env.PORT || 8000
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
