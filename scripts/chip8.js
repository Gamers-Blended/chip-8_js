// https://www.freecodecamp.org/news/creating-your-very-own-chip-8-emulator/

import Renderer from "./renderer.js";
import Keyboard from "./keyboard.js";
import Speaker from "./speaker.js";
import CPU from "./cpu.js";

// Initialise renderer
const renderer = new Renderer(10);

// Initialise keyboard
const keyboard = new Keyboard();

// Initialise speaker
const speaker = new Speaker();

// Initialise CPU
const cpu = new CPU(renderer, keyboard, speaker);

// 60 frames per second
let loop;

let fps = 60, fpsInterval, startTime, now, then, elapsed;

function init() {
    fpsInterval = 1000/fps;
    then = Date.now();
    startTime = then;

    // TESTING CODE. REMOVE WHEN DONE TESTING
    // renderer.testRender();
    // renderer.render();
    // END TESTING CODE

    cpu.loadSpritesIntoMemory();
    cpu.loadRom('roms/BLINKY');

    loop = requestAnimationFrame(step);
}

function step() {
    now = Date.now();
    elapsed = now - then;

    if (elapsed > fpsInterval) {
        // Cycle CPU
        cpu.cycle();
    }

    loop = requestAnimationFrame(step);
}

init();