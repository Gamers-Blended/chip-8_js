// Handle everything graphics-related
// Initialise Canvas
// Toggle pixels within display
// Render pixels on canvas

class Renderer {
    constructor(scale) {
        this.cols = 64;
        this.rows = 32;
        
        // scale: scale display to change pixel size
        this.scale = scale;

        this.canvas = document.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.canvas.width = this.cols * this.scale;
        this.canvas.height = this.rows * this.scale;

        // Array represents pixels, on (1) or off (0)
        this.display = new Array(this.cols * this.rows);

    }

    setPixel(x,y) {
        // Modify display array when pixel toggles on or off
        // If pixel positioned outside bounds, wrap to opposite side
        if (x > this.cols) {
            x -= this.cols;
        } else if (x < 0) {
            x += this.cols;
        }

        if (y > this.rows) {
            y -= this.rows;
        } else if (y < 0) {
            y += this.rows;
        }

        // Location of pixel
        let pixelLoc = x + (y * this.cols);

        // Sprites are XORed onto display
        // Toggle value at pixelLoc (0 to 1 or 1 to 0)
        // 1 = draw, 0 = erased
        this.display[pixelLoc] ^= 1;

        // If return true, erase
        // If return false, nothing erase
        return !this.display[pixelLoc];

    }

    clear() {
        this.display = new Array(this.cols * this.rows);
    }

    render() {
        // Render pixels in display array onto screen
        // 60 times per second

        // Clears display every render cycle, typical for a render loop
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Loop through display array
        for (let i = 0; i < this.cols * this.rows; i++) {
            // Grabs x position of pixel based off of 'i'
            let x = (i % this.cols) * this.scale;

            // Grabs y position of pixel based off of 'i'
            let y = Math.floor(i / this.cols) * this.scale;

            // If value at this.display[i] == 1, then draw pixel
            if (this.display[i]) {
                // Set pixel color to black
                this.ctx.fillStyle = '#000';

                // Place a pixel at position (x, y) with width and height of scale
                this.ctx.fillRect(x, y, this.scale, this.scale);
            }
        }
    }

    testRender() {
        this.setPixel(0, 0);
        this.setPixel(5, 2);
    }
    
}

export default Renderer;
