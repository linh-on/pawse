#include <WiFi.h>
#include <WebServer.h>
#include <LiquidCrystal.h>
#include <ESP32Servo.h>

// ── Pins ─────────────────────────────────────────────────
LiquidCrystal lcd(19, 18, 23, 22, 21, 5);
const int SERVO_PIN = 25;
const int YES_PIN   = 32;
const int NO_PIN    = 33;

// ── Servo angles — adjust these to fit your physical setup
const int LOCKED_ANGLE   = 0;    // arm blocks latch
const int UNLOCKED_ANGLE = 90;   // arm moves out of way

// ── WiFi AP ───────────────────────────────────────────────
const char* AP_SSID = "PawseBuddy";
const char* AP_PASS = "focusmode";

WebServer server(80);
Servo lockServo;

// ── State ─────────────────────────────────────────────────
enum State { IDLE, LOCKED, URGENT, RESUME, DONE };
State state = IDLE;

unsigned long sessionEnd = 0;
String urgentMsg = "";
unsigned long lastLCDRefresh = 0;
unsigned long lastDebounce = 0;
const unsigned long DEBOUNCE_MS = 300;

//  store time left after unlock
unsigned long resumeRemaining = 0;

// ── Helpers ───────────────────────────────────────────────
void setLock(bool unlock) {
  if (unlock) {
    lockServo.write(UNLOCKED_ANGLE);
  } else {
    lockServo.write(LOCKED_ANGLE);
  }
  delay(500); // give servo time to move
}

void lcdShow(String line1, String line2) {
  while (line1.length() < 16) line1 += " ";
  while (line2.length() < 16) line2 += " ";
  lcd.setCursor(0, 0); lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1); lcd.print(line2.substring(0, 16));
}

String formatTime(long secs) {
  if (secs < 0) secs = 0;
  char buf[8];
  sprintf(buf, "%02ld:%02ld", secs / 60, secs % 60);
  return String(buf);
}

void refreshCountdown() {
  long rem = max(0L, (long)(sessionEnd - millis()) / 1000);
  lcdShow("Focus Session", formatTime(rem) + " LOCKED");
}

// ── HTML Page ─────────────────────────────────────────────
const char HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PawseBuddy</title>
<style>
  body{font-family:sans-serif;max-width:420px;margin:30px auto;padding:16px;background:#f0f0f0}
  h1{color:#4a90d9;text-align:center}
  .card{background:white;border-radius:12px;padding:18px;margin:14px 0}
  button{padding:12px 20px;font-size:16px;border:none;border-radius:8px;cursor:pointer;width:100%;margin:5px 0}
  .btn-start{background:#4a90d9;color:white}
  .btn-yes{background:#e74c3c;color:white}
  .btn-no{background:#95a5a6;color:white}
  .btn-send{background:#e67e22;color:white}
  input{padding:10px;font-size:16px;border-radius:6px;border:1px solid #ccc;width:100%;box-sizing:border-box;margin:5px 0}
  #countdown{font-size:52px;font-weight:bold;color:#e74c3c;text-align:center}
  #statusText{text-align:center;font-size:18px;margin-bottom:8px}
</style>
</head>
<body>
<h1>PawseBuddy</h1>

<div class="card">
  <div id="statusText">Connecting...</div>
  <div id="countdown"></div>
</div>

<div class="card" id="startCard">
  <b>Start Focus Session</b>
  <input type="number" id="mins" placeholder="Minutes (e.g. 45)" min="1" max="180">
  <button class="btn-start" onclick="startSession()">Lock and Start</button>
</div>

<div class="card" id="msgCard" style="display:none">
  <b>Send Urgent Message to Box</b>
  <input type="text" id="msgInput" placeholder="e.g. Mom is calling">
  <button class="btn-send" onclick="sendUrgent()">Send Message</button>
</div>

<div class="card" id="urgentCard" style="display:none;background:#fff3cd">
  <b>Urgent Message</b>
  <p id="urgentText" style="font-size:18px"></p>
  <p>Do you want to unlock early?</p>
  <button class="btn-yes" onclick="respond('yes')">YES - Unlock Now</button>
  <button class="btn-no" onclick="respond('no')">NO - Stay Locked</button>
</div>

<div class="card" id="resumeCard" style="display:none;background:#e8f5e9">
  <b>Resume Session?</b>
  <p id="resumeText" style="font-size:18px"></p>
  <button class="btn-yes" onclick="resume('yes')">YES - Continue Timer</button>
  <button class="btn-no" onclick="resume('no')">NO - End Session</button>
</div>

<script>
function startSession(){
  var m=document.getElementById('mins').value;
  if(!m||m<1){alert('Enter valid minutes');return;}
  fetch('/start',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'minutes='+m});
}
function sendUrgent(){
  var msg=document.getElementById('msgInput').value;
  if(!msg){alert('Type a message first');return;}
  fetch('/urgent',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'msg='+encodeURIComponent(msg)});
  document.getElementById('msgInput').value='';
}
function respond(c){
  fetch('/respond',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'choice='+c});
}

function resume(c){
  fetch('/resume',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'choice='+c});
}

setInterval(function(){
  fetch('/status').then(function(r){return r.json();}).then(function(d){
    var st=document.getElementById('statusText');
    var cd=document.getElementById('countdown');
    var sc=document.getElementById('startCard');
    var mc=document.getElementById('msgCard');
    var uc=document.getElementById('urgentCard');
    var rc=document.getElementById('resumeCard');

    if(d.state==='IDLE'){
      st.textContent='Ready - set a timer below';
      cd.textContent='';sc.style.display='block';mc.style.display='none';uc.style.display='none';rc.style.display='none';
    }else if(d.state==='LOCKED'){
      st.textContent='Session Active';
      cd.textContent=d.remaining;sc.style.display='none';mc.style.display='block';uc.style.display='none';rc.style.display='none';
    }else if(d.state==='URGENT'){
      st.textContent='Urgent Message';
      cd.textContent=d.remaining;sc.style.display='none';mc.style.display='none';uc.style.display='block';rc.style.display='none';
      document.getElementById('urgentText').textContent=d.urgentMsg;
    }else if(d.state==='RESUME'){
      st.textContent='Session Paused';
      cd.textContent=d.remaining;
      sc.style.display='none';mc.style.display='none';
      uc.style.display='none';rc.style.display='block';
      document.getElementById('resumeText').textContent=
        'You have ' + d.remaining + ' remaining. Continue? Y/N';
    }else if(d.state==='DONE'){
      st.textContent='Session complete - box unlocked!';
      cd.textContent='';sc.style.display='block';mc.style.display='none';uc.style.display='none';rc.style.display='none';
    }
  }).catch(function(){});
},1000);
</script>
</body></html>
)rawliteral";

// ── HTTP Handlers ─────────────────────────────────────────
void handleRoot() { server.send(200, "text/html; charset=utf-8", HTML); }

void handleStart() {
  if (server.hasArg("minutes")) {
    int m = server.arg("minutes").toInt();
    if (m > 0) {
      sessionEnd = millis() + (unsigned long)m * 60000UL;
      state = LOCKED;
      setLock(false);
      urgentMsg = "";
      refreshCountdown();
    }
  }
  server.send(200, "text/plain", "OK");
}

void handleUrgent() {
  if (server.hasArg("msg") && state == LOCKED) {
    urgentMsg = server.arg("msg");
    state = URGENT;
    lcdShow(urgentMsg, "Yes=Unlock No=No");
  }
  server.send(200, "text/plain", "OK");
}

void handleRespond() {
  if (server.hasArg("choice")) {
    if (server.arg("choice") == "yes") {
      // check remaining time before unlocking
      resumeRemaining = (sessionEnd > millis()) ? (sessionEnd - millis()) : 0;
      setLock(true);
      state = RESUME;
      String remStr = formatTime(resumeRemaining / 1000);
      lcdShow("Continue? Y/N ", remStr + " left");
    } else {
      state = LOCKED;
      urgentMsg = "";
      refreshCountdown();
    }
  }
  server.send(200, "text/plain", "OK");
}

void handleResume() {
  if (server.hasArg("choice")) {
    if (server.arg("choice") == "yes") {
      // Restore timer from snapshot and re-lock
      sessionEnd = millis() + resumeRemaining;
      setLock(false);
      state = LOCKED;
      urgentMsg = "";
      refreshCountdown();
    } else {
      // User chose to end session
      state = DONE;
      lcdShow("  Session End ", "  Good work!  ");
    }
  }
  server.send(200, "text/plain", "OK");
}


void handleStatus() {
  long rem = 0;
  if (state==LOCKED||state==URGENT)
    rem = max(0L,(long)(sessionEnd-millis())/1000);
  else if (state==RESUME)
    rem = (long)(resumeRemaining/1000);

  String s;
  if(state==IDLE)        s="IDLE";
  else if(state==LOCKED) s="LOCKED";
  else if(state==URGENT) s="URGENT";
  else if(state==RESUME) s="RESUME";
  else                   s="DONE";
  String json = "{\"state\":\""+s+"\",\"remaining\":\""+formatTime(rem)+"\",\"urgentMsg\":\""+urgentMsg+"\"}";
  server.send(200, "application/json", json);
}

// ── Setup & Loop ──────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  lockServo.attach(SERVO_PIN);
  setLock(true); // start unlocked

  pinMode(YES_PIN, INPUT_PULLUP);
  pinMode(NO_PIN,  INPUT_PULLUP);

  lcd.begin(16, 2);
  delay(500);
  lcdShow(" PawseBuddy   ", "Starting...   ");

  WiFi.softAP(AP_SSID, AP_PASS);
  Serial.println("IP: " + WiFi.softAPIP().toString());

  server.on("/",        handleRoot);
  server.on("/start",   HTTP_POST, handleStart);
  server.on("/urgent",  HTTP_POST, handleUrgent);
  server.on("/respond", HTTP_POST, handleRespond);
  server.on("/resume",  HTTP_POST, handleResume);
  server.on("/status",  handleStatus);
  server.begin();

  lcdShow(" PawseBuddy   ", "192.168.4.1   ");
}

void loop() {
  server.handleClient();
  unsigned long now = millis();

  // Timer expired - auto unlock
  if (state == LOCKED && now >= sessionEnd) {
    setLock(true);
    state = DONE;
    lcdShow("  Times Up!   ", "  Unlocked!   ");
  }

  // Physical buttons
  if (state == URGENT && now - lastDebounce > DEBOUNCE_MS) {
    if (digitalRead(YES_PIN) == LOW) {
      lastDebounce = now;
      resumeRemaining = (sessionEnd > millis()) ? (sessionEnd - millis()) : 0;
      setLock(true);
      state = RESUME;
      String remStr = formatTime(resumeRemaining / 1000);
      lcdShow("Continue? Y/N", remStr + " left");
    } else if (digitalRead(NO_PIN) == LOW) {
      lastDebounce = now;
      state = LOCKED;
      urgentMsg = "";
      refreshCountdown();
    }
  }

  if (state == RESUME && now - lastDebounce > DEBOUNCE_MS) {
    if (digitalRead(YES_PIN) == LOW) {
      lastDebounce = now;
      sessionEnd = millis() + resumeRemaining;
      setLock(false);
      state = LOCKED;
      urgentMsg = "";
      refreshCountdown();
    } else if (digitalRead(NO_PIN) == LOW) {
      lastDebounce = now;
      state = DONE;
      lcdShow("  Session End ", "  Good work!  ");
    }
  }

  // Refresh LCD countdown every second
  if (state == LOCKED && now - lastLCDRefresh >= 1000) {
    lastLCDRefresh = now;
    refreshCountdown();
  }
}
