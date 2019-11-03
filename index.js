var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var currentlyTypingList = new Array();

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connect', socket => {
  socket.broadcast.emit('connections', 'A user connected.');

  socket.on('disconnect', () => {
    socket.broadcast.emit('connections', 'A user disconnected.');
  });

  socket.on('messages', data => {
    socket.broadcast.emit('messages', data);
  });

  socket.on('started_typing', username => {
    if (!currentlyTypingList.includes(username)) {
      currentlyTypingList.push(username);
      io.emit('typing_status', currentlyTypingList);
    }
  });

  socket.on('stopped_typing', username => {
    if (currentlyTypingList.includes(username)) {
      var index = currentlyTypingList.indexOf(username);
      currentlyTypingList.splice(index, 1);
      io.emit('typing_status', currentlyTypingList);
    }
  });
});

http.listen(3000, () => {
  console.log('listening on port 3000');
});
