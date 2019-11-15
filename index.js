var app = require("express")();
var http = require("http").createServer(app);
var io = require("socket.io")(http);

var currentlyTypingList = new Array();
var currentlyCountingDownList = new Array();
var numCountdowns = 0;
var countdownIndex = 0;

app.get("/", (req, res) => {
  // console.log(req);
  res.sendFile(__dirname + "/index.html");
});

// Create the ticking clock by emitting the current time on the "clock" channel.
setInterval(() => {
  let time = new Date();

  let upcoming420Delta = (time.getUTCHours() % 12) - 4;
  let upcoming420Offset = upcoming420Delta * 3600 * 1000;

  let cssClass = "default-clock";

  if (time.getUTCMinutes() === 18 || time.getUTCMinutes() === 19) {
    cssClass = "two-minute-warning";
  }

  if (
    time.getUTCMinutes() === 19 &&
    time.getUTCSeconds() >= 30 &&
    time.getUTCSeconds() <= 59
  ) {
    cssClass = "thirty-second-alert";
  }

  if (time.getUTCMinutes() === 20) {
    cssClass = "its-time-success";
  }

  let clock = {
    time: time,
    cssClass: cssClass,
    upcoming420Timezone: `UTC -${upcoming420Delta}`
  };

  io.emit("clock", clock);
}, 100);

io.on("connect", socket => {
  // When a client connects, broadcast a message to other connected clients.
  socket.broadcast.emit("connections", "A user connected.");

  // When a client disconnects, broadcast a message to other connected clients.
  socket.on("disconnect", () => {
    socket.broadcast.emit("connections", "A user disconnected.");
  });

  // When a client sends a message, broadcast it to other connected clients.
  // This uses the broadcast flag because it is assumed the client that sends the message
  //   will append it locally instead of waiting for it to be received again over the socket.
  socket.on("messages", messageData => {
    socket.broadcast.emit("messages", messageData);
  });

  // When a client signals that a user has started typing, add that user to the currently
  //   typing list if it does not already exist, then emit the list to all clients.
  socket.on("started_typing", username => {
    if (!currentlyTypingList.includes(username)) {
      currentlyTypingList.push(username);
      io.emit("typing_status", currentlyTypingList);
    }
  });

  // When a client signals that a user has stopped typing, remove that user from the
  //   currently typing list, then emit the list to all clients.
  socket.on("stopped_typing", username => {
    if (currentlyTypingList.includes(username)) {
      var index = currentlyTypingList.indexOf(username);
      currentlyTypingList.splice(index, 1);
      io.emit("typing_status", currentlyTypingList);
    }
  });

  socket.on("initiate_countdown", countdownData => {
    let elementId = `user-countdown-${countdownIndex}`;
    let currentUser = countdownData.username;
    let elementPosX = countdownData.xPosition;
    let elementPosY = countdownData.yPosition;

    if (currentlyCountingDownList.includes(currentUser)) return;

    currentlyCountingDownList.push(currentUser);

    const createContainer = `
        <div id='${elementId}'
             style='width:auto;
                    height:auto;
                    border:1px solid black;
                    background-color:white;
                    position:absolute;
                    padding:0.5vw;
                    left:${elementPosX}vw;
                    top:${elementPosY}vh;
                    display:flex;
                    flex-direction:column;' >
          <span style='font-size:1.5vw;
                       text-align:center;'>${currentUser}</span>
        </div>
      `;

    const updateContent = (
      divider,
      tMinus,
      three,
      two,
      one,
      ignition,
      blastOff
    ) => {
      return `
        <span style='font-size:1.5vw;
                     text-align:center;'>${currentUser}</span>
        <span style='display:${divider ? "block" : "none"};
                     font-size:1.5vw;
                     text-align:center;'>----------------</span>
        <span style='display:${tMinus ? "block" : "none"};
                     font-size:1.5vw;
                     text-align:center;'>T-Minus...</span>
        <span style='display:${three ? "block" : "none"};
                     font-size:1.5vw;
                     text-align:center;'>3...</span>
        <span style='display:${two ? "block" : "none"};
                     font-size:1.5vw;
                     text-align:center;'>2...</span>
        <span style='display:${one ? "block" : "none"};
                     font-size:1.5vw;
                     text-align:center;'>1...</span>
        <span style='display:${ignition ? "block" : "none"};
                     font-size:1.5vw;
                     text-align:center;'>Ignition...</span>
        <span style='display:${blastOff ? "block" : "none"};
                     font-size:1.5vw;
                     text-align:center;'>Blast Off!!!</span>
      `;
    };

    let countdown = {
      id: `${elementId}`,
      container: createContainer,
      content: null,
      action: "create"
    };
    io.emit("run_countdown", countdown);

    numCountdowns++;

    setTimeout(() => {
      countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent(true, false, false, false, false, false, false),
        action: "update"
      };
      io.emit("run_countdown", countdown);
    }, 2000);

    setTimeout(() => {
      countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent(true, true, false, false, false, false, false),
        action: "update"
      };
      io.emit("run_countdown", countdown);
    }, 3000);

    setTimeout(() => {
      countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent(true, true, true, false, false, false, false),
        action: "update"
      };
      io.emit("run_countdown", countdown);
    }, 4000);

    setTimeout(() => {
      countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent(true, true, true, true, false, false, false),
        action: "update"
      };
      io.emit("run_countdown", countdown);
    }, 5000);

    setTimeout(() => {
      countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent(true, true, true, true, true, false, false),
        action: "update"
      };
      io.emit("run_countdown", countdown);
    }, 6000);

    setTimeout(() => {
      countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent(true, true, true, true, true, true, false),
        action: "update"
      };
      io.emit("run_countdown", countdown);
    }, 7000);

    setTimeout(() => {
      countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent(true, true, true, true, true, true, true),
        action: "update"
      };
      io.emit("run_countdown", countdown);
    }, 8000);

    setTimeout(() => {
      countdown = {
        id: `${elementId}`,
        container: null,
        content: null,
        action: "remove"
      };
      io.emit("run_countdown", countdown);
      numCountdowns--;
      if (numCountdowns === 0) countdownIndex = 0;
      let usernameIndex = currentlyCountingDownList.indexOf(currentUser);
      currentlyCountingDownList.pop(usernameIndex);
    }, 10000);

    countdownIndex++;
  });
});

http.listen(3000, () => {
  console.log("listening on port 3000");
});
