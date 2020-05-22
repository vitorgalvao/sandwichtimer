/* eslint-disable no-use-before-define */

const APP_NAME = 'SandwichTimer';

// Global references to avoid problems on garbage collection
let appTray;
let notification;
let trayMenu;

const {
  app, Menu, Notification, Tray,
} = require('electron'); // eslint-disable-line import/no-extraneous-dependencies
const { spawn } = require('child_process');

const MENU_TEMPLATE = [
  { type: 'separator' },
  {
    id: 'Start',
    label: 'Start Pomodoro',
    click() {
      // noinspection JSIgnoredPromiseFromCall
      runPomodoro('work');
    },
  },
  {
    id: 'Stop',
    label: 'Stop Timer',
    click() {
      stopTimer();
    },
  },
  { type: 'separator' },
  {
    id: 'Quit',
    label: `Quit ${APP_NAME}`,
    click() {
      app.quit();
    },
  },
];

/*
 * By setting a global ID each timer is checked against, we ensure they are terminated correctly.
 * This way we can have a high setTimeout without worrying about overlapping timers.
 */
let globalCountdownId = Date.now();

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
  const title = trayMenu.items.find((i) => i.id === 'Title').label;

  if (time === 'work') {
    options = {
      title: 'Finished work time',
      body: 'Start the break at any time',
      sound: 'Blow',
      actions: [
        {
          type: 'button',
          text: 'Start break',
        }],
    };
  } else if (time === 'break') {
    options = {
      title: 'Break is over',
      body: 'Ready to start a new pomodoro whenever you want',
      sound: 'Blow',
      actions: [
        {
          type: 'button',
          text: 'New pomodoro',
        }],
    };
  } else {
    const plurality = time === '1' ? 'minute' : 'minutes';

    options = {
      title: `${title} timer done!`,
      body: `It was set for ${time} ${plurality}`,
      sound: 'Submarine',
      actions: [
        {
          type: 'button',
          text: 'Quit',
        }],
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
    appTray.setTitle(`${title} timer over`);
    notification.on('action', () => app.quit());
    notification.on('click', () => app.quit());
  }
}

function stopTimer(manually = true) {
  if (manually) {
    globalCountdownId = Date.now();
  }
  appTray.setTitle('');
  setTrayMenu('Pomodoro');
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
    // eslint-disable-next-line no-await-in-loop
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
  const menuTitle = {
    id: 'Title',
    label: trayTitle,
    enabled: false,
  };

  const menu = [...MENU_TEMPLATE];
  menu.unshift(menuTitle);
  trayMenu = Menu.buildFromTemplate(menu);
  appTray.setContextMenu(trayMenu);
  appTray.setToolTip(trayTitle);
}

function parseArgs() {
  // Normalise argument positions when running with electron and built app
  if (process.defaultApp) {
    process.argv.shift();
  }

  // usage is: sandwichtimer <minutes | pomodoro | quit> [title]
  //   where title could be given in single or separate words
  // from Alfred, all args will be given as a single first argument
  // from CLI, it could be any number of arguments, so concat them all together
  // so they can be processed uniformly
  const args = process.argv.slice(1).join(' ').split(' ');

  const mainArgument = args.shift();
  const trayTitle = args.join(' ');
  return [mainArgument, trayTitle];
}

app.on('ready', () => {
  const [argument, suppliedTitle] = parseArgs();

  if (argument === 'quit') {
    spawn('pkill', ['-i', APP_NAME]);
    app.quit();

    // if we do not return, the next lines will still execute before the app quits and we'll get a flash of a new instance
    return;
  }

  // noinspection JSCheckFunctionSignatures
  const startPomodoro = (!argument || isNaN(argument) || argument === 'pomodoro'); // eslint-disable-line no-restricted-globals

  let trayTitle;
  if (suppliedTitle) {
    trayTitle = suppliedTitle;
    trayTitle = suppliedTitle;
  } else if (startPomodoro) {
    trayTitle = 'Pomodoro';
  } else {
    trayTitle = `${argument} min`;
  }

  appTray = new Tray(`${__dirname}/iconTemplate@2x.png`);
  setTrayMenu(trayTitle);

  if (startPomodoro) {
    // noinspection JSIgnoredPromiseFromCall
    runPomodoro('work');
    return;
  }

  (async function () {
    const localCountdownId = globalCountdownId;
    await countdown(argument);

    // For a regular timer, keep making noise until the notification is acted upon
    while (localCountdownId === globalCountdownId) {
      showNotification(argument);
      // eslint-disable-next-line no-await-in-loop
      await asyncWait(2000);
    }
  }());
});
