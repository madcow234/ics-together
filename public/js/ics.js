$(function() {
  let socket = io();
  let typingList = [];
  let timezones = null;

  // The server will update the clock 10 times per second, but we don't want
  //   jQuery constantly updating the DOM, so always check to see if the
  //   client actually needs to be updated before invoking jQuery functions.
  socket.on("clock", newClock => {
    let $clock = $("#clock");
    let $clockContainer = $("#clock-container");

    let currentTime = new Date(newClock.time).toLocaleString("en-US", {
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true
    });

    // Update the clock time if it changes
    if ($clock.html() !== currentTime) {
      $clock.html(currentTime);
    }

    // Update the CSS class if it changes
    if (!$clockContainer.hasClass(newClock.cssClass)) {
      $clockContainer.removeClass();
      $clockContainer.addClass(newClock.cssClass);
    }
  });

  socket.on("upcoming-timezones", upcomingTimezones => {
    let $upcomingContainer = $("#upcoming-container");
    if ($upcomingContainer.css("display") !== "flex") {
      $upcomingContainer.css({ display: "flex" });
    }

    if (JSON.stringify(upcomingTimezones) !== JSON.stringify(timezones)) {
      timezones = null;
      timezones = upcomingTimezones;

      let amOffset = upcomingTimezones.AM[0].utcOffset;
      if (upcomingTimezones.AM.length === 2) {
        amOffset += "/" + upcomingTimezones.AM[1].utcOffset;
      }

      let pmOffset = upcomingTimezones.PM[0].utcOffset;
      if (upcomingTimezones.PM.length === 2) {
        pmOffset += "/" + upcomingTimezones.PM[1].utcOffset;
      }

      $("#am-offset").html(`AM: UTC ${amOffset}`);
      $("#pm-offset").html(`PM: UTC ${pmOffset}`);

      let amInterval = upcomingTimezones.AM[0].timezones.length;
      if (upcomingTimezones.AM.length === 2) {
        amInterval += upcomingTimezones.AM[1].timezones.length;
      }

      let pmInterval = upcomingTimezones.PM[0].timezones.length;
      if (upcomingTimezones.PM.length === 2) {
        pmInterval += upcomingTimezones.PM[1].timezones.length;
      }

      const loopTimezonesAM = () => {
        for (let i = 0; i < upcomingTimezones.AM.length; i++) {
          let numTimezones = upcomingTimezones.AM[0].timezones.length;
          setTimeout(() => {
            numTimezones = upcomingTimezones.AM[i].timezones.length;
            let amTimezone = upcomingTimezones.AM[i];
            for (let j = 0; j < amTimezone.timezones.length; j++) {
              setTimeout(() => {
                let timezone = amTimezone.timezones[j];
                $("#am-timezone").html(
                  `<div class="timezone">${timezone.name}</div>`
                );

                $("#am-cities-slider").html("");
                timezone["cities"].forEach(city => {
                  $("#am-cities-slider").append(`
                    <div class="city">
                      <span>${city.city}</span>
                      <span>${city.state}</span>
                      <span>${city.country}</span>
                    </div>`);
                });
              }, 5000 * j);
            }
          }, 5000 * i * numTimezones);
        }
      };

      const loopTimezonesPM = () => {
        for (let i = 0; i < upcomingTimezones.PM.length; i++) {
          let numTimezones = upcomingTimezones.PM[0].timezones.length;
          setTimeout(() => {
            numTimezones = upcomingTimezones.PM[i].timezones.length;
            let pmTimezone = upcomingTimezones.PM[i];
            for (let j = 0; j < pmTimezone.timezones.length; j++) {
              setTimeout(() => {
                let timezone = pmTimezone.timezones[j];
                $("#pm-timezone").html(
                  `<div class="timezone">${timezone.name}</div>`
                );

                $("#pm-cities-slider").html("");
                timezone["cities"].forEach(city => {
                  $("#pm-cities-slider").append(`
                    <div class="city">
                      <span>${city.city}</span>
                      <span>${city.state}</span>
                      <span>${city.country}</span>
                    </div>`);
                });
              }, 5000 * j);
            }
          }, 5000 * i * numTimezones);
        }
      };

      loopTimezonesAM();
      loopTimezonesPM();

      setInterval(() => {
        loopTimezonesAM();
      }, 5000 * amInterval);

      setInterval(() => {
        loopTimezonesPM();
      }, 5000 * pmInterval);

      // timezones.AM[0].timezones.forEach(timezone => {
      //   timezone.cities.forEach(city => {
      //     $("#am-cities-slider").append(`
      //       <div class="city">
      //         <span>${city.city}</span>
      //         <span>${city.state}</span>
      //         <span>${city.country}</span>
      //       </div>`);
      //   });
      // });

      // timezones.PM[0].timezones.forEach(timezone => {
      //   timezone.cities.forEach(city => {
      //     $("#pm-cities-slider").append(`
      //       <div class="city">
      //         <span>${city.city}</span>
      //         <span>${city.state}</span>
      //         <span>${city.country}</span>
      //       </div>`);
      //   });
      // });

      // let amSliderWidth = $("#am-cities-slider").width();
      // let pmSliderWidth = $("#pm-cities-slider").width();

      // $("#am-cities-slider")
      //   .get(0)
      //   .style.setProperty("--slider-width", `-${amSliderWidth}px`);
      // $("#pm-cities-slider")
      //   .get(0)
      //   .style.setProperty("--slider-width", `-${pmSliderWidth}px`);

      // $("#am-cities-slider")
      //   .get(0)
      //   .style.setProperty("animation", `slide infinite 30s linear`);
      // $("#pm-cities-slider")
      //   .get(0)
      //   .style.setProperty("animation", `slide infinite 30s linear`);
    }
  });

  socket.on("remove-upcoming-timezones", () => {
    let $upcomingContainer = $("#upcoming-container");
    if ($upcomingContainer.css("display") !== "none") {
      $upcomingContainer.css({ display: "none" });
    }
  });

  $("#messages").append($("<li>").text("You are connected."));

  $("#clock-container").on("click", e => {
    // Require a shift-click to start a countdown
    if (e.shiftKey) {
      // Prevent starting a countdown over top of an existing countdown
      if (
        e.target.id === "upcoming-timezone" ||
        e.target.id === "upcoming-cities" ||
        e.target.id === "clock-container" ||
        e.target.id === "clock"
      ) {
        let $username = $("#username");
        if ($username.val() !== "") {
          let xPos = (e.clientX / $(document).width()) * 100;
          let yPos = (e.clientY / $(document).height()) * 100;
          let countdownData = {
            username: $username.val(),
            xPosition: xPos,
            yPosition: yPos
          };
          socket.emit("initiate_countdown", countdownData);
        }
      }
    }
  });

  socket.on("start_countdown", countdownContainer => {
    $("#clock-container").append(countdownContainer);
  });

  socket.on("update_countdown", countdown => {
    // Append the countdown container to the page if it isn't already there
    // This is to sync up when a client joins during an active countdown
    let $countdownId = $(`#${countdown.id}`);
    if (!$countdownId.length) {
      $("#clock-container").append(countdown.container);
    }
    $countdownId.html(countdown.content);
  });

  socket.on("stop_countdown", countdownId => {
    $(`#${countdownId}`).remove();
  });

  $("form").on("submit", e => {
    e.preventDefault();
    let $message = $("#message");
    let messageData = {
      username: $("#username").val() || "(anonymous)",
      message: $message.val()
    };
    if (messageData.message !== "") {
      socket.emit("messages", messageData);
      $("#messages").append(
        $("<li>").text(messageData.username + ": " + messageData.message)
      );
      scrollToBottom();
      $message.val("");
    }
    socket.emit("stopped_typing", messageData.username);
    return false;
  });

  $("#message").on("input", () => {
    let $message = $("#message");
    let username = $("#username").val() || "(anonymous)";
    if ($message.val() === "") {
      socket.emit("stopped_typing", username);
    } else {
      if (!typingList.includes(username)) {
        socket.emit("started_typing", username);
      }
    }

    let prevMessage = $message.val();
    setTimeout(() => {
      if (prevMessage === $message.val()) {
        socket.emit("stopped_typing", username);
      }
    }, 3000);
  });

  socket.on("messages", data => {
    $("#messages").append($("<li>").text(data.username + ": " + data.message));
    scrollToBottom();
  });

  socket.on("connections", msg => {
    $("#messages").append($("<li>").text(msg));
    scrollToBottom();
  });

  socket.on("typing_status", currentlyTypingList => {
    let $typingStatus = $("#typing-status");
    typingList = currentlyTypingList;
    $("#typing-status-message").remove();
    if (currentlyTypingList.length === 1) {
      $typingStatus.append(
        '<div id="typing-status-message">' +
          currentlyTypingList +
          " is typing...</div>"
      );
    } else if (currentlyTypingList.length > 1) {
      $typingStatus.append(
        '<div id="typing-status-message">' +
          currentlyTypingList.join(", ") +
          " are typing...</div>"
      );
    }
  });

  const scrollToBottom = () => {
    $("#messages-container").scrollTop($("#messages").height());
  };

  // const sleep = ms => {
  //   return new Promise(resolve => setTimeout(resolve, ms));
  // };
});
