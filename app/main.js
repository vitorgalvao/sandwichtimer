const appName = 'SandwichTimer';

// Global references to avoid problems on garbage collection
let appTray;
let notification;
let trayMenu;
let title = null;

const { app, Menu, Notification, Tray } = require('electron');
const { spawn } = require('child_process');
const menuTemplate = [
  { id: 'Start', label: 'Start Pomodoro', click: function () { runPomodoro('work'); } },
  { id: 'Stop', label: 'Stop Timer', click: function () { stopTimer(); } },
  { type: 'separator' },
  { id: 'Quit', label: `Quit ${appName}`, click: function () { app.quit(); } }
];

let globalCountdownId = Date.now(); // By setting a global ID each timer is checked against, we ensure they are terminated correctly. This way we can have a high setTimeout without worrying about overlapping timers.

function asyncWait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function msToMin(milliseconds) {
  return milliseconds / 1000 / 60;
}

function minToMs(minutes) {
  return minutes * 1000 * 60;
}

function toggleStartStopMenu(makeVisible) {
  const [on, off] = makeVisible === 'Start' ? ['Start', 'Stop'] : ['Stop', 'Start'];
  trayMenu.items.forEach((item) => {
    if (item.id === on) {
      item.visible = true;
    } else if (item.id === off) {
      item.visible = false;
    }
  });
}

function showNotification(time) {
  let options;

  if (time === 'work') {
    options = {
      title: 'Finished work time',
      body: 'Start the break at any time',
      sound: 'Blow',
      actions: [{ type: 'button', text: 'Start break' }],
    };
  } else if (time === 'break') {
    options = {
      title: 'Break is over',
      body: 'Ready to start a new pomodoro whenever you want',
      sound: 'Blow',
      actions: [{ type: 'button', text: 'New pomodoro' }],
    };
  } else {
    const plurality = time === '1' ? 'minute' : 'minutes';

    options = {
      title: title ? `${title} timer done!` : 'Timer done!',
      body: `It was set for ${time} ${plurality}`,
      sound: 'Submarine',
      actions: [{ type: 'button', text: 'Quit' }],
    };
  }

  notification = new Notification(options);
  notification.show();

  if (time === 'work') {
    appTray.setTitle('Work over');
    notification.on('action', () => runPomodoro('break'));
    notification.on('click', () => runPomodoro('break'));
  } else if (time === 'break') {
    appTray.setTitle('Break over');
    notification.on('action', () => runPomodoro('work'));
    notification.on('click', () => runPomodoro('work'));
  } else {
    appTray.setTitle(title ? `${title} timer over` : 'Timer over');
    notification.on('action', () => app.quit());
    notification.on('click', () => app.quit());
  }
}

function stopTimer(manually = true) {
  if (manually) {
    globalCountdownId = Date.now();
  }
  appTray.setTitle('');
  setTrayMenu();
  toggleStartStopMenu('Start');
}

async function countdown(minutesToWait) {
  toggleStartStopMenu('Stop');
  const localCountdownId = globalCountdownId;

  const duration = minToMs(minutesToWait);
  const start = Date.now();
  let remainingMinutes = msToMin(duration);

  while (remainingMinutes > 0) {
    appTray.setTitle(remainingMinutes.toString());
    await asyncWait(20000);

    // This means the timer was terminated manually (and the global ID was changed)
    if (localCountdownId !== globalCountdownId) {
      return false;
    }

    remainingMinutes = Math.ceil(msToMin(duration - (Date.now() - start)));
  }

  stopTimer(false);
  return true;
}

async function runPomodoro(time) {
  const minutes = (time === 'work') ? '25' : '5';

  // Only show notification if timer ended successfully
  if (await countdown(minutes)) {
    showNotification(time);
  }
}

function setTrayMenu(trayTitle) {
  const menu = [...menuTemplate];

  // If given a title, prepend to the template,
  // else, replace menu with one with no title
  if (trayTitle) {
    const separator = { type: 'separator' };
    const menuTitle = {
      id: 'Title',
      label: trayTitle,
      enabled: false,
    };

    menu.unshift(separator);
    menu.unshift(menuTitle);
  }

  trayMenu = Menu.buildFromTemplate(menu);
  appTray.setContextMenu(trayMenu);
}

function parseArgs() {
  // Normalise argument positions when running with electron and built app
  if (process.defaultApp) {
    process.argv.shift();
  }

  // Usage: sandwichtimer <minutes | pomodoro | quit> [title]
  const args = process.argv.slice(1);

  const mainArgument = args.shift();
  const trayTitle = args.shift();
  return [mainArgument, trayTitle];
}

app.on('ready', () => {
  const [argument, suppliedTitle] = parseArgs();

  if (argument === 'quit') {
    spawn('pkill', ['-i', appName]);
    app.quit();

    // If we do not return, the next lines will still execute before the app quits and we'll get a flash of a new instance
    return;
  }

  appTray = new Tray(`${__dirname}/iconTemplate@2x.png`);

  if ((!argument || isNaN(argument) || argument === 'pomodoro')) {
    setTrayMenu();
    runPomodoro('work');
    return;
  } else {
    if (suppliedTitle) {
      title = suppliedTitle;
    } else {
      title = `${argument} min`;
    }

    setTrayMenu(title);
  }

  (async function () {
    const localCountdownId = globalCountdownId;
    await countdown(argument);

    // For a regular timer, keep making noise until the notification is acted upon
    while (localCountdownId === globalCountdownId) {
      showNotification(argument);
      await asyncWait(2000);
    }
  }());
});
