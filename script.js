const DAY_START = 8 * 60;
const DAY_END = 22 * 60;
const SLOT_MINUTES = 15;

let sessions = [];  // global variable

fetch("nicar-schedule.json")
  .then(res => res.json())
  .then(data =>{ 
    sessions = data.sessions;
    // Save session interested state

    sessions.forEach(s => {
    // Create unique ID: date_room_start
    s.id = `${s.date}_${s.room}_${s.start}`;
    
    // Load persisted interested state if exists
    const stored = localStorage.getItem(`interested_${s.id}`);
    s.interested = stored === "true"; // convert string to boolean
    });
    init(data.sessions); 
});

function init(sessions) {
  const days = [...new Set(sessions.map(d => d.date))];
  const dayButtons = document.getElementById("day-buttons");

  days.forEach(day => {
    const btn = document.createElement("button");
    const dateObj = new Date(day);
    const weekday = dateObj.toLocaleDateString("en-US", { weekday: "long" });
    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const date = dateObj.getDate().toString().padStart(2, "0");
    btn.textContent = `${weekday} ${month}/${date}`;

    // btn.onclick = () => renderDay(day, sessions);

    btn.onclick = () => {
        document.querySelectorAll("#day-buttons button").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        renderDay(day, sessions);
    };

    dayButtons.appendChild(btn);
  });


// ...


  renderDay(days[0], sessions);

  // Modal close

  const modal = document.getElementById("modal");
    const modalContent = modal.querySelector(".content");

    // Close when clicking the X
    modal.querySelector(".close").onclick = () => {
    modal.style.display = "none";
    };

    // Close when clicking outside the content
    modal.addEventListener("click", (e) => {
    if (!modalContent.contains(e.target)) {
        modal.style.display = "none";
    }
});
}





function renderDay(day, sessions) {
  const daySessions = sessions.filter(d => d.date === day);
  const rooms = [...new Set(daySessions.map(d => d.room))].sort();

  buildTimeAxis();
  buildCalendarGrid(rooms);

  daySessions.forEach(session => {
    placeSession(session, rooms);
  });
}

function buildTimeAxis() {
  const axis = document.getElementById("time-axis");
  axis.innerHTML = "";

  const totalSlots = (DAY_END - DAY_START) / SLOT_MINUTES;
  axis.style.gridTemplateRows = `repeat(${totalSlots}, 20px)`;

  for (let i = 0; i < totalSlots; i++) {
    const mins = DAY_START + i * SLOT_MINUTES;
    const hour = Math.floor(mins / 60);
    const minute = mins % 60;

    const div = document.createElement("div");
    div.className = "time-slot";

    if (minute === 0) {
      div.textContent = formatTime(hour, minute);
    }
    axis.appendChild(div);
  }
}



function buildCalendarGrid(rooms) {
  const cal = document.getElementById("calendar");
  cal.innerHTML = "";

  const totalSlots = (DAY_END - DAY_START) / SLOT_MINUTES;
  const cols = rooms.length;

  cal.style.gridTemplateColumns = `repeat(${cols}, 110px)`;
  
//   cal.style.gridTemplateRows = `repeat(${totalSlots}, 20px)`;
  cal.style.gridTemplateRows = `40px repeat(${totalSlots}, 20px)`;
// 40px is the height of .room-header


  rooms.forEach((room, i) => {
    const header = document.createElement("div");
    header.className = "room-header";
    header.textContent = room;
    header.style.gridColumn = i + 1;
    header.style.gridRow = "1 / 2";
    cal.appendChild(header);
  });
}


let currentSessionDiv = null; // keep track of the clicked session div

function placeSession(session, rooms) {
  const cal = document.getElementById("calendar");
  const startMin = timeToMinutes(session.start);
  const endMin = timeToMinutes(session.end);

  const rowStart = Math.floor((startMin - DAY_START) / SLOT_MINUTES) + 2;
    const rowEnd = Math.floor((endMin - DAY_START) / SLOT_MINUTES) + 2;
  const col = rooms.indexOf(session.room) + 1;

  const div = document.createElement("div");
  div.className = "session";
  div.style.gridColumn = col;
  div.style.gridRow = `${rowStart} / ${rowEnd}`;
  
  div.innerHTML = `<strong>${session.title}</strong>`;

  // Add time label title
  const startNormal = formatTime(...session.start.split(":").map(Number));
  const endNormal = formatTime(...session.end.split(":").map(Number));
  div.innerHTML = `<span class="session-time">${startNormal} – ${endNormal}</span> <strong>${session.title}</strong>`;

  // Apply the interested state
  if (session.interested) div.classList.add("highlighted");

  
  // Store reference for modal toggle
  div._session = session;
  session._div = div;

    // Click listener for modal
  div.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent bubbling
    currentSessionDiv = div; // track which div was clicked
    showDetails(session);
  });
  cal.appendChild(div);
}






function showDetails(session) {
  document.getElementById("modal-title").textContent = session.title;
    // Time: military + normal
  const startMilitary = session.start;
  const endMilitary = session.end;
  const startNormal = formatTime(...startMilitary.split(":").map(Number));
  const endNormal = formatTime(...endMilitary.split(":").map(Number));

  document.getElementById("modal-time").innerHTML =
    `<strong>Time:</strong> ${startMilitary} – ${endMilitary} (${startNormal} – ${endNormal})`;
  document.getElementById("modal-room").innerHTML = `<strong>Location:</strong> ${session.room}`;
  document.getElementById("modal-tracks").innerHTML =
    "<strong>Tracks: </strong>" + session.tracks.join(", ");
  document.getElementById("modal-desc").innerHTML = `<strong>Description:</strong> ${session.description}`;

  document.getElementById("modal").style.display = "flex";

  const interestBtn = document.getElementById("interest-toggle");

  // Update button text based on current state
  if (currentSessionDiv.classList.contains("highlighted")) {
    interestBtn.textContent = "Not Interested";
  } else {
    interestBtn.textContent = "Interested";
  }

  // Click handler for toggling interest
  interestBtn.onclick = () => {
    session.interested = !session.interested;       // toggle
    localStorage.setItem(`interested_${session.id}`, session.interested); // save


    if (currentSessionDiv.classList.contains("highlighted")) {
      currentSessionDiv.classList.remove("highlighted");
      interestBtn.textContent = "Interested";
    } else {
      currentSessionDiv.classList.add("highlighted");
      interestBtn.textContent = "Not Interested";
    }

    
  };

  // Show modal
  document.getElementById("modal").style.display = "flex";
}



function timeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(hour, minute) {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:${minute.toString().padStart(2,"0")} ${ampm}`;
}





