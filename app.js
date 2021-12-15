
const http = require('http');
const port = process.env.PORT || 3000

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end('<h1>Hello World</h1>');
});

//var io = require('socket.io')(server);
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
  }
});
//za random ime korisnika koji se konektovao na socket
const genUsername = require("unique-username-generator");
//generisanje username za  korisnika koji se konektovao na socket
var user;
var messages=[];


io.use((socket, next) => {
  socket.username = genUsername.generateUsername("-", 0, 10);
  user= {username:socket.username,id:socket.id};
  next();   
});


io.on('connection', (socket) => {

  const users = [];
  for (let [id, socket] of io.of("/").sockets) {
      users.push({
      userID: id,
      username: socket.username,
      connected:socket.connected
      });
  }
  
  //slanje konektovanom korisniku ime i konektovane korisnike prvi put
  socket.emit("name", user);
  socket.emit("users", users);
  socket.emit("history-messages", {username:"",id:"", messages:messages});
  
  socket.on('chat-users', (msg) => {
    socket.broadcast.emit("users", users);
  });

  socket.on('message', (msg) => {

    socket.broadcast.emit('message-broadcast', msg);
    messages.push({user:msg.username,text:msg.message})
  });

  socket.on('typing', (msg) => {
    if(msg.id===""){
      socket.broadcast.emit('typing-message', msg.username);
    }else{ 
      //ako je privatna poruka poslan je id kom socketu treba da se proslijedi
      socket.to(msg.id).emit("typing-message", msg.username);
    }
  });

  socket.on('private', (msg) => {
    socket.broadcast.emit('open-private', msg);
  });

  socket.on('message-private', (msg) => {
    socket.to(msg.userTo).emit("message-broadcast", msg);
  });

  socket.on('join-private', (msg) => {
    socket.to(msg.to).emit("join-private-mess", msg.from);
  });

  socket.on("open-global", ({ username, id, privateUser }) => {


    socket.emit("history-messages", {username:username,id:id, messages:messages});
 
    
    //obavijet za privatni chat
    if( privateUser!=null){
    socket.to(privateUser.userID).emit("left-private-mess", privateUser.username);
    }

  });

  socket.on("disconnect", () => {
    socket.broadcast.emit("disconnesctUser", {username:socket.username, connected:socket.connected});
  });

});

server.listen(port,() => {
  console.log(`Server running at port `+port);
});