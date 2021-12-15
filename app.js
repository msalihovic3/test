
const port = process.env.PORT || 3000
var app = require('express')();
var mysql = require('mysql');
var http = require('http').createServer(app);
var io = require('socket.io')(http);

//za random ime korisnika koji se konektovao na socket
const genUsername = require("unique-username-generator");
//generisanje username za  korisnika koji se konektovao na socket
var user;

//konekcija na bazu
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database:"chat_db"
});

con.connect(function(err) {
  if (err) {console.log("Error");}
  else console.log("Connected!");
  
});

app.get('/', (req, res) => res.send('<h1>Hello World</h1>'));

//prilikom slanja zahtjeva za konekciju dodjeljuje se ime
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

    socket.on('message', (msg) => {

      socket.broadcast.emit('message-broadcast', msg);
      
      let sql = "INSERT INTO chatdbTable (user, text) VALUES (?, ?)"
      con.query(sql,[ msg.username, msg.message ], function (err, result) {
        if (err) console.log("Error");
        else console.log("1 record inserted");
      }); 
    });

    socket.on('typing', (msg) => {
      if(msg.id===""){
        socket.broadcast.emit('typing-message', msg.username);
      }else{ 
        //ako je privatna poruka poslan je id kom socketu treba da se proslijedi
        socket.to(msg.id).emit("typing-message", msg.username);
      }
    });
    
    //zahtjev za privatni chat
    socket.on('private', (msg) => {
      socket.broadcast.emit('open-private', msg);
    });

    socket.on('message-private', (msg) => {
      socket.to(msg.userTo).emit("message-broadcast", msg);
    });
    
    //obavijest 
    socket.on('join-private', (msg) => {
      socket.to(msg.to).emit("join-private-mess", msg.from);
    });

    socket.on("open-global", ({ username, id, privateUser }) => {

      con.query("SELECT user,text FROM chatdbTable", function (err, result, fields) {
        if (err) console.log("Error");
        else socket.emit("history-messages", {username:username,id:id, messages:result});
      });   
      
      //obavijet za privatni chat
      if( privateUser!=null){
      socket.to(privateUser.userID).emit("left-private-mess", privateUser.username);
      }

    });

    socket.on("disconnect", () => {
      socket.broadcast.emit("disconnesctUser", {username:socket.username, connected:socket.connected});
    });
       
});

http.listen(port,() => {
  console.log(`Server running at port `+port);
});