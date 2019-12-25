const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const fs = require("fs");

let currentlyTypingList = [];
let currentlyCountingDownList = [];
let numCountdowns = 0;
let countdownIndex = 0;

// Read the timezone files into memory
let timezonesFile = fs.readFileSync("timezones.json");
let timezones = JSON.parse(timezonesFile.toString());

app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  // console.log(req);
  res.sendFile(__dirname + "/public/index.html");
});

// Date.prototype.stdTimezoneOffset = function() {
//   let jan = new Date(this.getFullYear(), 0, 1);
//   let jul = new Date(this.getFullYear(), 6, 1);
//   return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
// };
//
// Date.prototype.isDstObserved = function() {
//   return this.getTimezoneOffset() < this.stdTimezoneOffset();
// };

/**
 * Calculates the offsets between an hour in UTC and the corresponding timezones at the 4 o'clock hours.
 *     Ex. utcHour = 4 => return { AM: '+0', PM: '+12' }
 *     Ex. utcHour = 18 => return { AM: '+10', PM: '-2' }
 *
 * @param {Number} utcHour - The hour, in UTC, of which to find the corresponding 4 o'clock timezones
 * @returns {{AM: string, PM: string}} The offsets between UTC and which timezones correspond to the 4AM and 4PM hours
 */
const getICSOffsetStrings = utcHour => {
  let offsetAM = utcHour < 16 ? 4 - utcHour : 12 - (utcHour % 16);
  let offsetAMString = offsetAM < 0 ? `${offsetAM}` : `+${offsetAM}`;

  let offsetPM = utcHour < 4 ? -8 - utcHour : 16 - utcHour;
  let offsetPMString = offsetPM < 0 ? `${offsetPM}` : `+${offsetPM}`;

  return { AM: offsetAMString, PM: offsetPMString };
};

// Create the ticking clock by emitting the current time on the "clock" channel.
setInterval(() => {
  let time = new Date();
  let currentMinute = time.getUTCMinutes();
  let currentSecond = time.getUTCSeconds();

  // The minute of the hour in which to start the ICS warning procedure
  let target = 60;
  let alert = target - 1;
  let warn = target - 2;

  let cssClass = "default-clock";

  if (currentMinute === warn || currentMinute === alert) {
    cssClass = "two-minute-warning";
  }

  if (currentMinute === alert && currentSecond >= 30 && currentSecond <= 59) {
    cssClass = "thirty-second-alert";
  }

  if (currentMinute === target) {
    cssClass = "its-time-target";
  }

  let clock = {
    time: time,
    cssClass: cssClass
  };

  io.emit("clock", clock);

  // Upcoming timezones and cities are only visible for 20 minutes before an ics
  if (currentMinute >= target - 20 && currentMinute <= target) {
    let icsOffsets = getICSOffsetStrings(time.getUTCHours());

    let upcomingTimezones = {
      AM: [
        {
          utcOffset: icsOffsets.AM,
          timezones: timezones[icsOffsets.AM]
        }
      ],
      PM: [
        {
          utcOffset: icsOffsets.PM,
          timezones: timezones[icsOffsets.PM]
        }
      ]
    };

    if (icsOffsets.AM === "-10") {
      upcomingTimezones.AM.push({
        utcOffset: "+14",
        timezones: timezones["+14"]
      });
    }

    if (icsOffsets.AM === "-11") {
      upcomingTimezones.AM.push({
        utcOffset: "+13",
        timezones: timezones["+13"]
      });
    }

    if (icsOffsets.PM === "-10") {
      upcomingTimezones.PM.push({
        utcOffset: "+14",
        timezones: timezones["+14"]
      });
    }

    if (icsOffsets.PM === "-11") {
      upcomingTimezones.PM.push({
        utcOffset: "+13",
        timezones: timezones["+13"]
      });
    }

    io.emit("upcoming-timezones", upcomingTimezones);
  } else {
    io.emit("remove-upcoming-timezones");
  }
}, 100);

/**
 * Defines all the listeners to attach to the websocket when a client connects to the server.
 */
io.on("connect", socket => {
  /**
   * When a client connects, broadcast a message to other connected clients.
   */
  socket.broadcast.emit("connections", "A user connected.");

  /**
   * When a client disconnects, broadcast a message to other connected clients.
   */
  socket.on("disconnect", () => {
    socket.broadcast.emit("connections", "A user disconnected.");
  });

  /**
   * When a client sends a message, broadcast it to other connected clients.
   * This uses the broadcast flag because it is assumed the client that sends the message
   *     will append it locally instead of waiting for it to be received again over the socket.
   */
  socket.on("messages", messageData => {
    socket.broadcast.emit("messages", messageData);
  });

  /**
   * When a client signals that a user has started typing, add that user to the currently
   *     typing list if it does not already exist, then emit the list to all clients.
   */
  socket.on("started_typing", username => {
    if (!currentlyTypingList.includes(username)) {
      currentlyTypingList.push(username);
      io.emit("typing_status", currentlyTypingList);
    }
  });

  /**
   * When a client signals that a user has stopped typing, remove that user from the
   *     currently typing list, then emit the list to all clients.
   */
  socket.on("stopped_typing", username => {
    if (currentlyTypingList.includes(username)) {
      let index = currentlyTypingList.indexOf(username);
      currentlyTypingList.splice(index, 1);
      io.emit("typing_status", currentlyTypingList);
    }
  });

  socket.on("initiate_countdown", countdownData => {
    let elementId = `user-countdown-${countdownIndex}`;
    let currentUser = countdownData.username;
    let elementPosX = countdownData.xPosition;
    let elementPosY = countdownData.yPosition;

    // Only allow one countdown per user
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
                    color: black;
                    left:${elementPosX}vw;
                    top:${elementPosY}vh;
                    display:flex;
                    flex-direction:column;' >
          <span style='font-size:1.5vw;
                       text-align:center;'>${currentUser}</span>
        </div>
      `;

    const updateContent = (
      fontSize,
      divider,
      tMinus,
      three,
      two,
      one,
      ignition,
      blastOff
    ) => {
      return `
        <span style='font-size:${fontSize};
                     text-align:center;'>${currentUser}</span>
        <span style='display:${divider ? "block" : "none"};
                     font-size:${fontSize};
                     text-align:center;'>------------------</span>
        <span style='display:${tMinus ? "block" : "none"};
                     font-size:${fontSize};
                     text-align:center;'>|.. T-Minus ..|</span>
        <span style='display:${three ? "block" : "none"};
                     font-size:${fontSize};
                     text-align:center;'>|....... 3 .......|</span>
        <span style='display:${two ? "block" : "none"};
                     font-size:${fontSize};
                     text-align:center;'>|....... 2 .......|</span>
        <span style='display:${one ? "block" : "none"};
                     font-size:${fontSize};
                     text-align:center;'>|....... 1 .......|</span>
        <span style='display:${ignition ? "block" : "none"};
                     font-size:${fontSize};
                     text-align:center;'>|.. Ignition ..|</span>
        <span style='display:${blastOff ? "block" : "none"};
                     font-size:${fontSize};
                     text-align:center;'>| Blast off!! |</span>
      `;
    };

    // Trigger the client to append a countdown container to the page
    io.emit("start_countdown", createContainer);

    numCountdowns++;

    setTimeout(() => {
      let countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent('1.5vw', 1, 0, 0, 0, 0, 0, 0)
      };
      io.emit("update_countdown", countdown);
    }, 2000);

    setTimeout(() => {
      let countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent('1.5vw', 1, 1, 0, 0, 0, 0, 0)
      };
      io.emit("update_countdown", countdown);
    }, 3000);

    setTimeout(() => {
      let countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent('1.4vw', 1, 1, 1, 0, 0, 0, 0)
      };
      io.emit("update_countdown", countdown);
    }, 4000);

    setTimeout(() => {
      let countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent('1.3vw', 1, 1, 1, 1, 0, 0, 0)
      };
      io.emit("update_countdown", countdown);
    }, 5000);

    setTimeout(() => {
      let countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent('1.2vw', 1, 1, 1, 1, 1, 0, 0)
      };
      io.emit("update_countdown", countdown);
    }, 6000);

    setTimeout(() => {
      let countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent('1.0vw', 1, 1, 1, 1, 1, 1, 0)
      };
      io.emit("update_countdown", countdown);
    }, 7000);

    setTimeout(() => {
      let countdown = {
        id: `${elementId}`,
        container: createContainer,
        content: updateContent('0.9vw', 1, 1, 1, 1, 1, 1, 1)
      };
      io.emit("update_countdown", countdown);
    }, 8000);

    setTimeout(() => {
      // Trigger the client to remove the countdown when it finishes
      io.emit("stop_countdown", elementId);

      // Remove the user from the currently counting down list
      currentlyCountingDownList.splice(
        currentlyCountingDownList.indexOf(currentUser)
      );

      numCountdowns--;
      // Reset the countdown index if no countdowns are on the screen
      if (numCountdowns === 0) countdownIndex = 0;
    }, 10000);

    countdownIndex++;
  });
});

http.listen(3000, () => {
  console.log("listening on port 3000");
});
