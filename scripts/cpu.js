// Chip-8 specs
// 4KB (4096 bytes) of memory
// 16 8-bit registers
// 16-bit register (this.i) to store memory addresses
// 2 timers: 1 for delay, 1 for sound
// Program counter that stores address currently being executed
// Array to represent stack

class CPU {
    constructor(renderer, keyboard, speaker) {
        this.renderer = renderer;
        this.keyboard = keyboard;
        this.speaker = speaker;

        // 4KB memory
        this.memory = new Uint8Array(4096);

        // 16 8-bit registers
        this.v = new Uint8Array(16);

        // Stores memory addresses.
        // Set to 0 since not storing anything at initialisation
        this.i = 0;

        // Timers
        this.delayTimer = 0;
        this.soundTimer = 0;

        // Program counter
        // Stores currently executing address
        this.pc = 0x200;

        // Don't initialise this with a size to avoid empty results
        this.stack = new Array();

        // Some instructions require pausing, such as Fx0A
        this.paused = false;

        this.speed = 10;
    }

    loadSpritesIntoMemory() {
        // Array of hex values for each sprite
        // Each sprite is 5 bytes
        // Technical reference provides each value
        const sprites = [
            0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
            0x20, 0x60, 0x20, 0x20, 0x70, // 1
            0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
            0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
            0x90, 0x90, 0xF0, 0x10, 0x10, // 4
            0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
            0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
            0xF0, 0x10, 0x20, 0x40, 0x40, // 7
            0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
            0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
            0xF0, 0x90, 0xF0, 0x90, 0x90, // A
            0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
            0xF0, 0x80, 0x80, 0x80, 0xF0, // C
            0xE0, 0x90, 0x90, 0x90, 0xE0, // D
            0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
            0xF0, 0x80, 0xF0, 0x80, 0x80  // F
        ];

        // Sprites are stored in interpreter section of memory starting at hex 0x000
        for (let i = 0; i < sprites.length; i++) {
            this.memory[i] = sprites[i];
        }
    }

    loadProgramIntoMemory(program) {
        // Loop through contents of program
        // Store in memory
        for (let loc = 0; loc < program.length; loc++) {
            // Most programs start at 0x200
            this.memory[0x200 + loc] = program[loc];
        }
    }

    loadRom(romName) {
        // Grab ROM from filesystem before loading into memory
        var request = new XMLHttpRequest;
        var self = this;

        // Handles response received from sending (request.send()) request
        request.onload = function() {
            // If request response has content
            if (request.response) {
                // Store contents of response in 8-bit array
                let program = new Uint8Array(request.response);

                // Load ROM/program into memory
                self.loadProgramIntoMemory(program);
            }
        }

        // Initialize GET request to retrieve ROM from roms folder
        request.open('GET', 'roms/' + romName);
        request.responseType = 'arraybuffer';

        // Send GET request
        request.send();
    }

    // CPU cycle handles execution of instructions
    // Called in step() in chip8.js, executed about 60 times per second
    cycle() {
        // Handles execution of instructions
        // Higher speed, more instructions executed per cycle
        for (let i = 0; i < this.speed; i++) {
            // Instructions should only be executed when emulator is running
            if (!this.paused) {
                // Each instruction is 16 bits (2 bytes) long
                // Memory made of 8 bit (1 byte) pieces
                // Have to combine 2 pieces of memory to get full opcode (this.pc and this.pc + 1)

                // To combine
                // Shift first piece of memory 8 bits left to make it 2 bytes long
                // Add 2 '0's / hex value 0x00 onto RHS
                // eg. 0x11 -> 0x1100
                // Bitwise OR |
                // PC = 0x10 -> shift 8 bits left 0x1000
                // PC + 1 = 0xF0
                // 0x1000 | 0xF0 = 0x10F0
                let opcode = (this.memory[this.pc] << 8 | this.memory[this.pc + 1]);
                this.executeInstruction(opcode);
            }
        }

        // Update timers when emulator is running (not paused)
        if (!this.paused) {
            this.updateTimers();
        }

        this.playSound();
        this.renderer.render();
    }

    // Each timer, delay and sound, decrement by 1 at 60Hz
    // Every 60 frames, timers decrement by 1
    updateTimers() {
        // For tracking when certain events occur
        // Only used in 2 instructions:
        // 1. Setting its value
        // 2. Reading its value and branching to another instruction if a certain value is present
        if (this.delayTimer > 0) {
            this.delayTimer -= 1;
        }

        // Controls sound length
        // Continue to play until timer hits 0
        if (this.soundTimer > 0) {
            this.soundTimer -= 1;
        }
    }

    // Play sound as long as soundTimer > 0
    // play() from Speaker class
    playSound() {
        if (this.soundTimer > 0){
            this.speaker.play(440);
        } else {
            this.speaker.stop();
        }
    }

    // Logic for all 36 instructions
    // All instructions are 2 bytes long
    // Each time instruction is executed, or this function is ran, increment program counter by 2
    // So CPU knows where next instructon is
    executeInstruction(opcode) {
        // Increment program counter to prepare it for next instruction
        // Each instruction is 2 bytes long, increment by 2
        this.pc += 2;

        // nnn or addr - A 12-bit value, the lowest 12 bits of the instruction
        // n or nibble - A 4-bit value, the lowest 4 bits of the instruction
        // x - A 4-bit value, the lower 4 bits of the high byte of the instruction
        // y - A 4-bit value, the upper 4 bits of the low byte of the instruction
        // kk or byte - An 8-bit value, the lowest 8 bits of the instruction

        // x and y are used by nearly every instruction
        // 4 bits (hald a byte/nibble) each
        // eg. instruction 0x5460
        // High byte: 0x54
        // Low byte: 0x60
        // Lower 4 bits of high byte: 0x4
        // Upper 4 bits of low byte: 0x6
        // x = 0x4, y = 0x6

        // Only need 2nd nibble, grab value of 2nd nibble
        // Shift it right 8 bits to remove everything but that 2nd nibble
        let x = (opcode & 0x0F00) >> 8;

        // Only need 3rd nibble, grab value of 3rd nibble
        // Shift it right 4 bits to remove everything but that 3rd nibble
        let y = (opcode & 0x00F0) >> 4;
        
        // eg. instruction 0x5460
        // & (bitwise AND) instruction with hex value 0x0F00 -> 0x0400
        // Shift 8 bits right -> 0x04 or 0x4
        // & instruction with 0x00F0 -> 0x0060
        // Shift 4 bits right -> 0x006 or 0x6

        // Upper 4 bits
        switch (opcode & 0xF000) {
            // 0nnn - SYS addr can be ignored
            
            case 0x0000:
                switch (opcode) {
                    // CLS
                    case 0x00E0:
                        // Clears display
                        this.renderer.clear();
                        break;
                    // RET
                    case 0x00EE:
                        // Pop last element in stack array and store it in this.pc
                        // Return from subroutine
                        this.pc = this.stack.pop();
                        break;
                        // Also subtracts 1 from stack pointer
                        // Stack pointer points to topmost level of stack
                        // Top of stack handled by stack array
                }
            
                break;
            // 1nnn - JP addr
            case 0x1000:
                // Set program counter to value stored in nnn
                // 0XFFF grabs value of nnn
                // 0x1426 & 0xFFF -> 0x426
                this.pc = (opcode & 0xFFF);
                break;
            // 2nnn - CALL addr
            case 0x2000:
                // Push this.pc onto stack
                this.stack.push(this.pc);
                this.pc = (opcode & 0xFFF);
                break;
            // 3xkk - SE Vx, byte
            case 0x3000:
                // Compares value stored in x register (Vx) to value of kk
                // v signifies a register and the value following it (this case, x is the register number)
                // If equal, increment program counter by 2, skipping next instruction
                // Grab last byte of opcode (kk)
                if (this.v[x] === (opcode & 0XFF)) {
                    this.pc += 2;
                }
                break;
            // 4xkk - SNE Vx, byte
            case 0x4000:
                // Skips the next instruction if Vx and kk are not equal
                if (this.v[x] !== (opcode & 0XFF)) {
                    this.pc += 2;
                }
                break;
            // 5xy0 - SE Vx, Vy
            case 0x5000:
                // Skip next intruction if Vx equals Vy
                if (this.v[x] === this.v[y]) {
                    this.pc += 2;
                }
                break;
            // 6xkk - LD Vx, byte
            case 0x6000:
                // Set value of Vx to value of kk
                this.v[x] = (opcode & 0xFF);
                break;
            // 7xkk - ADD Vx, byte
            case 0x7000:
                // Adds kk to Vx
                this.v[x] += (opcode & 0xFF);
                break;
            case 0x8000:
                // Set of different instructions under 0x8000
                // Last nibble of each instruction ends with 0-7 or E
                // Grab last nibble
                switch (opcode & 0xF) {
                    // 8xy0 - LD Vx, Vy
                    case 0x0:
                        this.v[x] = this.v[y];
                        break;
                    // 8xy1 - OR Vx, Vy
                    case 0x1:
                        // Set Vx to value of Vx OR Vy
                        this.v[x] |= this.v[y];
                        break;
                    // 8xy2 - AND Vx, Vy
                    case 0x2:
                        // Set Vx equal to value of Vx & Vy
                        this.v[x] &= this.v[y];
                        break;
                    // 8xy3 - XOR Vx, Vy
                    case 0x3:
                        // Set Vx equal to value of Vx XOR Vy
                        this.v[x] ^= this.v[y];
                        break;
                    // 8xy4 - ADD Vx, Vy
                    case 0x4:
                        // Sets Vx to Vx + Vy
                        // If result > 8 bits (255), VF set to 1
                        // Otherwise 0
                        // Only lowest 8 bits of result are kept and stored in Vx
                        let sum = (this.v[x] += this.v[y]);

                        // VF
                        this.v[0xF] = 0;

                        // 0xFF = 255
                        if (sum > 0xFF) {
                            this.v[0xF] = 1;
                        }

                        this.v[x] = sum;

                        // this.v is Unit8Array
                        // Any value over 8 bits automatically has lower, rightmost, 8 bits taken and stored in array
                        // eg.
                        // Put decimal 257 (100000001, 9-bit) into this.v array
                        // When trying to store 9-bit value into array
                        // It will only take lower 8 bits (00000001)
                        // 1 in decimal, stored in this.v
                        break;
                    // 8xy5 - SUB Vx, Vy
                    case 0x5:
                        // Subtracts Vy from Vx
                        // Need handle underflow
                        // -1 -> 255
                        // -2 -> 254, etc.
                        this.v[0xF] = 0;

                        if (this.v[x] > this.v[y]) {
                            this.v[0xF] = 1;
                        }

                        this.v[x] -= this.v[y];
                        break;
                    // 8xy6 - SHR Vx {,Vy}
                    case 0x6:
                        // Determine least-significant bit
                        // Set VF accordingly
                        // If Vx is 1001, VF set to 1 since least-significant bit is 1
                        // If Vx is 1000, VF set to 0
                        this.v[0xF] = (this.v[x] & 0x1);

                        this.v[x] >>= 1;
                        break;
                    // 8xy7 - SUBN Vx, Vy
                    case 0x7:
                        // Subtracts Vx from Vy
                        // Stores result in Vx
                        this.v[0xF] = 0;

                        if (this.v[y] > this.v[x]) {
                            this.v[0xF] = 1;
                        }

                        this.v[x] = this.v[y] - this.v[x];
                        break;
                    // 8xyE - SHL Vx {, Vy}
                    case 0xE:
                        // Shifts Vx left 1
                        // Sets VF to 0/1

                        // Grab most significant bit of Vx and store in VF
                        // Vx, 8-bit register
                        // To get most significant (leftmost) bit, AND Vx with 10000000 (0x80 in hex)
                        this.v[0xF] = (this.v[x] & 0x80);
                        // Multiply Vx by 2 by shifting left 1
                        this.v[x] <<= 1;
                        break;
                }

                break;
            // 9xy0 - SNE Vx, Vy
            case 0x9000:
                // Increments program counter by 2 if Vx and Vy are not equal
                if (this.v[x] !== this.v[y]) {
                    this.pc += 2;
                }
                break;
            // Annn - LD I, addr
            case 0xA000:
                // Set value of register i to nnn
                // If opcode is 0xA740 -> return 0x740
                this.i = (opcode & 0xFFF);
                break;
            // Bnnn - JP V0, addr
            case 0xB000:
                // Set program counter to nnn + value of register 0 (V0)
                this.pc = (opcode & 0xFFF) + this.v[0];
                break;
            // Cxkk - RND Vx, byte
            case 0xC000:
                // Generate random number 0-255
                let rand = Math.floor(Math.random() * 0xFF);

                // AND with lowest byte of opcode
                // eg. 0xB849 & 0xFF -> 0x49
                this.v[x] = rand & (opcode & 0xFF);
                break;
            // Dxyn - DRW Vx, Vy, nibble
            case 0xD000:
                // Handles drawing and erasing pixels on screen

                // Each sprite is 8 pixels wide
                let width = 8;
                // Value of last nibble (n)
                // If opcode is 0xD235, height set to 5
                let height = (opcode & 0xF);

                this.v[0xF] = 0;

                // A sprite looks like this
                // 11110000
                // 10010000
                // 10010000
                // 10010000
                // 11110000

                // Go through each row
                for (let row = 0; row < height; row++) {
                    // Grab 8-bit memory (single row of sprite) stored at this.i + row
                    // Start at address stored in i
                    let sprite = this.memory[this.i + row];

                    // Go through bit by bit (column by column)
                    for (let col = 0; col < width; col++) {
                        // Grab leftmost bit
                        // If bit (sprite) is not 0, render/erase pixel
                        // 0 -> sprite does not have pixel at location
                        if ((sprite & 0x80) > 0) {
                            // Input for setPixel() is position to draw/erase pixel
                            // If setPixel returns 1 -> erase pixel, set VF to 1
                            // If 0 -> nothing, VF = 0
                            if (this.renderer.setPixel(this.v[x] + col, this.v[y] + row)) {
                                // Pixels erased
                                this.v[0xF] = 1;
                            }
                        }

                        // Shift sprite left by 1 bit
                        // This moves next col/bit of sprite into first position (can go through each bit)
                        // eg. 10010000 << 1 -> 0010000
                        // Then go through another iteration of inner for loop to determine whether to draw pixel
                        sprite <<= 1;
                    }
                }
                break;
            case 0xE000:
                switch (opcode & 0xFF) {
                    // Ex9E - SKP Vx
                    case 0x9E:
                        // Skips next instruction if key stored in Vx is pressed
                        // Increment program counter by 2
                        if (this.keyboard.isKeyPressed(this.v[x])) {
                            this.pc += 2;
                        }
                        break;
                    // ExA1 - SKNP Vx
                    case 0xA1:
                        // If specified key is not pressed, skip next instruction
                        if (!this.keyboard.isKeyPressed(this.v[x])) {
                            this.pc += 2;
                        }
                        break;
                }
                break;
            case 0xF000:
                switch (opcode & 0xFF) {
                    // Fx07 - LD Vx, DT
                    case 0x07:
                        // Set Vx to value stored in delayTimer
                        this.v[x] = this.delayTimer;
                        break;
                    // Fx0A - LD Vx, K
                    case 0x0A:
                        // Pauses emulator until a key is pressed
                        this.paused = true;

                        // Initialise onNextKeyPress() (null in keyboard.js)
                        this.keyboard.onNextKeyPress = function(key) {
                            // Set Vx to pressed key's keycode
                            this.v[x] = key;
                            this.paused = false;
                        }.bind(this);
                        break;
                    // Fx15 - LD DT, Vx
                    case 0x15:
                        // Sets value of delayTimer to value stored in register Vx
                        this.delayTimer = this.v[x];
                        break;
                    // Fx18 - LD ST, Vx
                    case 0x18:
                        // Sets soundTimer to Vx
                        this.soundTimer = this.v[x];
                        break;
                    // FxE - ADD I, Vx
                    case 0x1E:
                        // Add Vx to I
                        this.i += this.v[x];
                        break;
                    // Fx29 - LD F, Vx - ADD I, Vx
                    case 0x29:
                        // Set I to location of sprite at Vx
                        // Multiplied by 5 as each sprite is 5 bytes long
                        this.i = this.v[x] * 5;
                        break;
                    // Fx33 - LD B, Vx
                    case 0x33:
                        // Grab hundreds, tens, ones digit from register Vx
                        // Store them in registers I, I+1, I+2

                        // Get hundreds digit and place it in I
                        this.memory[this.i] = parseInt(this.v[x] / 100);

                        // Get tens digit and place it in I+1
                        // Get a value between 0 and 99, then divide by 10 to give value between 0 and 9
                        this.memory[this.i + 1] = parseInt((this.v[x] % 100) / 10);

                        // Get value of ones (last) digit and place it in I+2
                        this.memory[this.i + 2] = parseInt(this.v[x] % 10);
                        break;
                    // Fx55 - LD [I], Vx
                    case 0x55:
                        // Loop through registers V0 through Vx and store value in memory starting at I
                        for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
                            this.memory[this.i + registerIndex] = this.v[registerIndex];
                        }
                        break;
                    // Fx65 - LD Vx, [I]
                    case 0x65:
                        // Reads values from memory starting at I and stores them in registers V0 through Vx
                        for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
                            this.v[registerIndex] = this.memory[this.i + registerIndex];
                        }
                        break;
                }

                break;

            default:
                throw new Error('Unknown opcode' + opcode);
        }
    }



}

export default CPU;