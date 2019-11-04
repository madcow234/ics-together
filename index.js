var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

var currentlyTypingList = new Array();

app.get('/', (req, res) => {
  // console.log(req);
  res.sendFile(__dirname + '/index.html');
});

// Create the ticking clock by emitting the current time on the "clock" channel.
// It is the client's responsibility to display the time in the correct format and timezone.
setInterval(() => {
  io.emit('clock', new Date());
}, 500);

io.on('connect', socket => {
  // When a client connects, broadcast a message to other connected clients.
  socket.broadcast.emit('connections', 'A user connected.');

  // When a client disconnects, broadcast a message to other connected clients.
  socket.on('disconnect', () => {
    socket.broadcast.emit('connections', 'A user disconnected.');
  });

  // When a client sends a message, broadcast it to other connected clients.
  // This uses the broadcast flag because it is assumed the client that sends the message
  //   will append it locally instead of waiting for it to be received again over the socket.
  socket.on('messages', data => {
    socket.broadcast.emit('messages', data);
  });

  // When a client signals that a user has started typing, add that user to the currently
  //   typing list if it does not already exist, then emit the list to all clients.
  socket.on('started_typing', username => {
    if (!currentlyTypingList.includes(username)) {
      currentlyTypingList.push(username);
      io.emit('typing_status', currentlyTypingList);
    }
  });

  // When a client signals that a user has stopped typing, remove that user from the
  //   currently typing list, then emit the list to all clients.
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
