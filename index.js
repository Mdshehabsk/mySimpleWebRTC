require('dotenv')

const express = require('express');
const app = express();
const http = require('http');
const { Server } = require("socket.io");
const server = http.createServer(app);

const io = new Server(server)
app.use(express.static(`${__dirname}/public`))

app.get('/', (req, res) => {
  res.sendFile(`${__dirname}/public/index.html`)
});

let connectedUser = []
io.on('connection',socket => {
    connectedUser.push(socket.id)
    socket.on('call-offer', recieverId => {
      const userExist = connectedUser.some(userId => userId === recieverId)
      if(userExist){
        io.to(recieverId).emit('call-offer-sent',{callerId:socket.id})
      }
    })
    socket.on('call-offer-sent',CallerId => {
      io.to(CallerId).emit('call-offer-sent',{recieverId:socket.id})
    })
    socket.on('call-accept',({callerId})=> {
      io.to(callerId).emit('call-accept',socket.id)
    })
    socket.on('webRTC-signaling',data => {
      const {connectedUserSocketId} = data
      io.to(connectedUserSocketId).emit('webRTC-signaling',data)
    })
    socket.on('remoteStream',data=> {
      console.log(data)
    })
    socket.on('disconnect',() => {
        const newConnectedUser = connectedUser.filter(userId => userId !== socket.id)
        connectedUser = newConnectedUser
        
    })
})


const PORT = process.env.PORT || 8000

server.listen(PORT, () => {
  console.log(`server listing or port http://localhost:${PORT}`);
});