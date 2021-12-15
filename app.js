
const http = require('http');
const port = process.env.PORT || 3000

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end('<h1>Hello World</h1>');
});

var io = require('socket.io')(server);
//za random ime korisnika koji se konektovao na socket
const genUsername = require("unique-username-generator");
//generisanje username za  korisnika koji se konektovao na socket
var user;

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
  
  socket.on('chat-users', (msg) => {
    socket.broadcast.emit("users", users);
  });

});

server.listen(port,() => {
  console.log(`Server running at port `+port);
});