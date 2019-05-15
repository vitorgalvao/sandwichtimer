const appName = 'SandwichTimer';

// Global references to avoid problems on garbage collection
let appTray;
let notification;

const {app, Menu, Notification, Tray} = require('electron');
const exec = require('child_process').exec;
const menuTemplate = [
  { label: 'Start Pomodoro', click: function () { runPomodoro('work'); } },
  { label: 'Stop Timer', click: function () { stopTimer(); } },
  { type: 'separator' },
  { label: 'Quit ' + appName, click: function () { app.quit(); } }
]
const trayMenu = Menu.buildFromTemplate(menuTemplate);

let globalCountdownId = Date.now(); // By setting a global ID each timer is checked against, we ensure they are terminated correctly. This way we can have a high setTimeout without worrying about overlapping timers.

function asyncWait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function msToMin(milliseconds) {
  return milliseconds / 1000 / 60;
}

function minToMs(minutes) {
  return minutes * 1000 * 60;
}

function showMenuOption(makeVisible) {
  if (makeVisible === 'Start') {
    trayMenu.items[0].visible = true;
    trayMenu.items[1].visible = false;
    return;
  }

  if (makeVisible === 'Stop') {
    trayMenu.items[0].visible = false;
    trayMenu.items[1].visible = true;
    return;
  }
}

async function showNotification(time) {
  let options;

  if (time === 'work') {
    options = {
      title: 'Finished work time',
      body: 'Start the break at any time',
      sound: 'Blow',
      actions: [{ type: 'button', text: 'Start break' }]
    }
  } else if (time === 'break') {
    options = {
      title: 'Break is over',
      body: 'Ready to start a new pomodoro whenever you want',
      sound: 'Blow',
      actions: [{ type: 'button', text: 'New pomodoro' }]
    }
  } else {
    const plurality = time == '1' ? 'minute' : 'minutes'

    options = {
      title: 'Timer done!',
      body: 'It was set for ' + time + ' ' + plurality,
      sound: 'Submarine',
      actions: [{ type: 'button', text: 'Quit' }]
    }
  }

  notification = new Notification(options);
  notification.show();

  if (time === 'work') {
    appTray.setTitle('Work over');
    notification.on('action', function() { runPomodoro('break'); });
    notification.on('click',  function() { runPomodoro('break'); });
  } else if (time === 'break') {
    appTray.setTitle('Break over');
    notification.on('action', function() { runPomodoro('work'); });
    notification.on('click',  function() { runPomodoro('work'); });
  } else {
    appTray.setTitle('Timer over');
    notification.on('action', function() { app.quit(); });
    notification.on('click',  function() { app.quit(); });
  }
}

function stopTimer() {
  globalCountdownId = Date.now();
  showMenuOption('Start');
  appTray.setTitle('');
}

async function runPomodoro(time) {
  let minutes = (time === 'work') ? '25' : '5'
  if (await countdown(minutes)) showNotification(time); // Only show notification if timer ended successfully
}

async function countdown(minutesToWait) {
  showMenuOption('Stop');
  let localCountdownId = globalCountdownId;

  const duration = minToMs(minutesToWait);
  const start = Date.now();
  let remainingMinutes = msToMin(duration);

  while (remainingMinutes > 0) {
    appTray.setTitle(remainingMinutes.toString());
    await asyncWait(20000);

    if (localCountdownId !== globalCountdownId) return false; // This means the timer was terminated manually (and the global ID was changed)

    remainingMinutes = Math.ceil(msToMin(duration - (Date.now() - start)));
  }

  stopTimer();
  return true;
}

app.on('ready', function(){
  if (process.defaultApp) process.argv.shift(); // Normalise argument positions when running with electron and built app
  const argument = process.argv[1];

  if (argument === 'quit') {
    exec('pkill -i ' + appName);
    app.quit();
    return; // if we do not return, the next lines will still execute before the app quits and we'll get a flash of a new instance
  }

  appTray = new Tray(__dirname + '/iconTemplate@2x.png');
  appTray.setContextMenu(trayMenu);

  if ((isNaN(argument)) || argument === '' || argument === 0 || argument === 'pomodoro') {
    runPomodoro('work');
    return;
  }

  (async function() {
    await countdown(argument);

    // For a regular timer, keep making noise until the notification is acted upon
    while (true) {
      showNotification(argument);
      await asyncWait(2000);
    }
  })();
});
