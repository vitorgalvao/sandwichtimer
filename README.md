# <img src='https://i.imgur.com/Wi6JyPt.png' width='45' align='center' alt='SandwichTimer logo'> SandwichTimer

Use a CLI to set timers. Built for use with the [SandwichTimer Alfred Workflow](https://github.com/vitorgalvao/alfred-workflows/tree/master/SandwichTimer).

## Usage

SandwichTimer was initally built to be a [Pomodoro](https://en.wikipedia.org/wiki/Pomodoro_Technique) timer controllable via CLI, but it can be used as a regular timer. While you can simply open the app and a Pomodoro cycle will start, it’s meant to be called with its CLI:

```bash
SandwichTimer.app/Contents/MacOS/SandwichTimer "{{time_in_minutes}}"
```

Unlike most other timers, only the remaining minutes are shown, not the seconds.

<img src="https://i.imgur.com/5BJ2IR1.png" width="51"> <img src="https://i.imgur.com/75pSIEh.png" width="51">

Calling via CLI with no argument or `pomodoro` as the argument will initiate a repeating Pomodoro cycle, with actionable notifications at each stage.

<img src="https://i.imgur.com/l6v9q1c.png" width="378" align="left">
<img src="https://i.imgur.com/TKOa5E3.png" width="378">

Calling it with a number will initiate a timer. Its notification will continue firing until you quit it.

<img src="https://i.imgur.com/Jrzk411.png" width="378">

Calling it with `quit` as the argument will exit all running timers.

For custom minute timers, any optional additional arguments are treated as the title to appear menu tray for the timer, which can be used to distinguish multiple timers.
This appears as a disabled first item in the menu, as not to take up precious room on the bar itself, and will show on the notifications when done.

```bash
SandwichTimer.app/Contents/MacOS/SandwichTimer 20 Check Laundry
```

## Install

[Download the latest version](https://github.com/vitorgalvao/sandwichtimer/releases), or install via the [SandwichTimer Alfred Workflow](https://github.com/vitorgalvao/alfred-workflows/tree/master/SandwichTimer).

## Development

Built with [Electron](http://electron.atom.io).

`npm start` will call `electron main.js` and only then give the arguments. This means that while testing, an extra argument is passed on the command line. As such, the `process.argv` array positions need to be increased by one when testing, and be returned to their original state before building the app.

##### Commands

- Install dependencies: `npm install`
- Run: `npm start`
- Build for macOS: `npm run build-macos`
- Build for all platforms: `npm run build`
- Build for macOS and package as a zip: `npm run package-macos`
- Build for all platforms and package as a zip: `npm run package`

Currently, only macOS is supported. I do not intend to officially support other platforms in the near future since I cannot consistently and reliably test on them, but am willing to add support if someone wants to collaborate in doing the legwork.

#### License

The Unlicense (Public Domain, essentially)
