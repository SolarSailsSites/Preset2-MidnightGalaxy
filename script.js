const canvas = document.getElementById('galaxyCanvas');
const ctx = canvas.getContext('2d');

const V_WIDTH = 256;
const V_HEIGHT = 144;
canvas.width = V_WIDTH;
canvas.height = V_HEIGHT;

const imgData = ctx.createImageData(V_WIDTH, V_HEIGHT);
const data = imgData.data;

// Core colors for space dust & nebula gas [R,G,B]
const cBuffer = [
    5, 3, 12, // 0,1,2: Deep Space Void Base
    60, 15, 85, // 3,4,5: Core Nebula Purple
    25, 75, 135, // 6,7,8: Cosmic Sky Blue
    135, 205, 250, // 9,10,11: Bright Cyan Center Core
    255, 255, 255 // 12,13,14: Pure Star White
];

// Pre-generate permanent starlight placements
const numStars = 60;
const starsX = new Float32Array(numStars);
const starsY = new Float32Array(numStars);
const starsMag = new Float32Array(numStars);

for (let i = 0; i < numStars; i++) {
    starsX[i] = Math.random() * V_WIDTH;
    starsY[i] = Math.random() * (V_HEIGHT * 0.62);
    starsMag[i] = 0.4 + Math.random() * 0.6;
}

// Pre-calculate mountain peaks directly on horizon line
const baselineHorizon = Math.floor(V_HEIGHT * 0.62);
const mountainHeights = new Int16Array(V_WIDTH);

for (let x = 0; x < V_WIDTH; x++) {
    let peak1 = Math.sin(x * 0.05) * 12;
    let peak2 = Math.cos(x * 0.12) * 4;
    let peak3 = Math.sin(x * 0.02) * 6;
    mountainHeights[x] = baselineHorizon - Math.floor(Math.abs(peak1 + peak2 + peak3));
}

let time = 0;

// --- 60 FPS FIXED TIMESTEP ACCUMULATOR LOGIC ---
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS; // ~16.66ms
let lastTime = performance.now();
let accumulator = 0;

function updateSimulation() {
    time += 0.006;
}

function renderFrame() {
    const horizon = baselineHorizon;

    for (let y = 0; y < V_HEIGHT; y++) {
        const isLake = y >= horizon;

        let sampleY = y;
        if (isLake) {
            let waveDistortion = Math.sin(y * 0.5 + time * 6.0) * 1.5;
            sampleY = horizon - (y - horizon) + Math.floor(waveDistortion);
            sampleY = Math.max(0, Math.min(horizon - 1, sampleY));
        }

        for (let x = 0; x < V_WIDTH; x++) {
            const idx = (y * V_WIDTH + x) * 4;
            const mountainTopY = mountainHeights[x];

            let isMountain = false;
            if (!isLake) {
                isMountain = y >= mountainTopY && y < horizon;
            } else {
                isMountain = sampleY >= mountainTopY && sampleY < horizon;
            }

            let r = cBuffer[0],
                g = cBuffer[1],
                b = cBuffer[2];

            if (isMountain) {
                r = 4;
                g = 3;
                b = 10;
            } else {
                // GALAXY ELLIPSE MATH
                let dx = x - V_WIDTH * 0.5;
                let dy = sampleY - V_HEIGHT * 0.28;

                let rotX = dx * 0.94 - dy * 0.34;
                let rotY = dx * 0.34 + dy * 0.94;

                let ellipseVal = Math.sqrt((rotX * rotX * 0.18) + (rotY * rotY * 2.8));
                let noiseFactor = Math.sin(rotX * 0.05 - time) * 0.25;
                let density = Math.exp(-Math.pow(ellipseVal / 18.0, 2)) * (0.8 + noiseFactor);

                if (density > 0.02) {
                    if (ellipseVal < 10) {
                        let f = Math.min(1, density * 1.5);
                        r = cBuffer[9] * f + cBuffer[0] * (1 - f);
                        g = cBuffer[10] * f + cBuffer[1] * (1 - f);
                        b = cBuffer[11] * f + cBuffer[2] * (1 - f);
                    } else {
                        let f = Math.sin(rotX * 0.03 + time) * 0.5 + 0.5;
                        r = (cBuffer[3] * f + cBuffer[6] * (1 - f)) * density * 1.8;
                        g = (cBuffer[4] * f + cBuffer[7] * (1 - f)) * density * 1.8;
                        b = (cBuffer[5] * f + cBuffer[8] * (1 - f)) * density * 1.8;
                    }
                }

                // TWINKLING STARS
                for (let i = 0; i < numStars; i++) {
                    if (x === Math.floor(starsX[i]) && sampleY === Math.floor(starsY[i])) {
                        let twinkle = Math.sin(time * 5.0 + i) * 0.4 + 0.6;
                        let bright = starsMag[i] * twinkle * 200;
                        r += bright;
                        g += bright;
                        b += bright;
                    }
                }
            }

            // LAKE REFLECTION
            if (isLake) {
                if (isMountain) {
                    r = r * 0.40;
                    g = g * 0.40;
                    b = b * 0.60 + 2;
                } else {
                    r = r * 0.35;
                    g = g * 0.38;
                    b = b * 0.55 + 5;
                }
            }

            // RETRO CHECKERBOARD DITHER ENGINE
            const isDitherTile = (x + y) % 2 === 0;
            const ditherOffset = isDitherTile ? 12 : -12;

            let finalR = Math.min(255, Math.max(0, r + ditherOffset));
            let finalG = Math.min(255, Math.max(0, g + ditherOffset));
            let finalB = Math.min(255, Math.max(0, b + ditherOffset));

            data[idx] = Math.round(finalR / 16) * 16;
            data[idx + 1] = Math.round(finalG / 16) * 16;
            data[idx + 2] = Math.round(finalB / 16) * 16;
            data[idx + 3] = 255;
        }
    }

    ctx.putImageData(imgData, 0, 0);
}

function gameLoop(now) {
    let delta = now - lastTime;
    lastTime = now;

    if (delta > 250) delta = 250; // Tab-switch lag protection

    accumulator += delta;

    let updated = false;
    while (accumulator >= FRAME_TIME) {
        updateSimulation();
        accumulator -= FRAME_TIME;
        updated = true;
    }

    if (updated) {
        renderFrame();
    }

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame((now) => {
    lastTime = now;
    requestAnimationFrame(gameLoop);
});

// --- INTERACTIVE CLICK TO TOGGLE FULL BACKGROUND ---
const overlay = document.getElementById('overlay');
const hint = document.getElementById('hint');

function toggleFocus() {
    overlay.classList.toggle('hidden');
    hint.classList.toggle('hidden');
}

// Click canvas to hide/show
canvas.addEventListener('click', toggleFocus);

// Click overlay background (outside card) to toggle
overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
        toggleFocus();
    }
});

// Keyboard shortcuts (Space, Esc)
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Escape') {
        toggleFocus();
    }
});

// Automatically update copyright year
document.getElementById('current-year').innerText = new Date().getFullYear();