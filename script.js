const canvas = document.getElementById('galaxyCanvas');
const ctx = canvas.getContext('2d');

const V_WIDTH = 256;
const V_HEIGHT = 144;
canvas.width = V_WIDTH;
canvas.height = V_HEIGHT;

const imgData = ctx.createImageData(V_WIDTH, V_HEIGHT);
const data = imgData.data;

// Horizon level separating sky/mountains and ocean
const HORIZON_Y = Math.floor(V_HEIGHT * 0.72); // Row y=103

// -------------------------------------------------------------
// STARFIELD INITIALIZATION (GRID-SPACED DISTRIBUTION)
// -------------------------------------------------------------
// 1. Hero 4-Point Cross Stars (✦)
const crossStars = [];
const crossCols = 5;
const crossRows = 3;
const cellWidth = V_WIDTH / crossCols;
const cellHeight = (HORIZON_Y * 0.75) / crossRows;

for (let r = 0; r < crossRows; r++) {
    for (let c = 0; c < crossCols; c++) {
        const jitterX = 8 + Math.random() * (cellWidth - 16);
        const jitterY = 6 + Math.random() * (cellHeight - 12);
        crossStars.push({
            x: Math.floor(c * cellWidth + jitterX),
            y: Math.floor(r * cellHeight + jitterY),
            phase: Math.random() * Math.PI * 2,
            speed: 1.5 + Math.random() * 2.0
        });
    }
}

// 2. Background 1-pixel Tiny Stars
const tinyStars = [];
const tinyCols = 8;
const tinyRows = 4;
const tCellWidth = V_WIDTH / tinyCols;
const tCellHeight = (HORIZON_Y * 0.8) / tinyRows;

for (let r = 0; r < tinyRows; r++) {
    for (let c = 0; c < tinyCols; c++) {
        const jitterX = 4 + Math.random() * (tCellWidth - 8);
        const jitterY = 4 + Math.random() * (tCellHeight - 8);
        tinyStars.push({
            x: Math.floor(c * tCellWidth + jitterX),
            y: Math.floor(r * tCellHeight + jitterY),
            phase: Math.random() * Math.PI * 2,
            speed: 1.0 + Math.random() * 2.0
        });
    }
}

// -------------------------------------------------------------
// FLAT MOUNTAINS / DISTANT RIDGE HEIGHTMAP GENERATION
// -------------------------------------------------------------
const mountainMap = new Float32Array(V_WIDTH);
for (let x = 0; x < V_WIDTH; x++) {
    const m1 = Math.sin(x * 0.035) * 7.0;
    const m2 = Math.cos(x * 0.08) * 3.5;
    const m3 = Math.sin(x * 0.15) * 2.0;
    mountainMap[x] = HORIZON_Y - 14 + (m1 + m2 + m3);
}

// -------------------------------------------------------------
// FREQUENT COMET SYSTEM (SHINE IN PLACE -> SHOOT DOWN-LEFT)
// -------------------------------------------------------------
const comet = {
    state: 'waiting', // 'waiting' -> 'shining' -> 'shooting'
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    timer: 20,
    shineDuration: 20,
    shootDuration: 28,
    length: 12
};

function resetComet() {
    comet.state = 'shining';
    comet.x = V_WIDTH * 0.55 + Math.random() * (V_WIDTH * 0.35);
    comet.y = Math.random() * (V_HEIGHT * 0.3);
    comet.timer = 0;
}

// -------------------------------------------------------------
// SPIRAL GALAXY VORTEX PARAMETERS
// -------------------------------------------------------------
const GALAXY_CX = V_WIDTH * 0.5; // Center X
const GALAXY_CY = V_HEIGHT * 0.36; // Center Y
const GALAXY_RADIUS = 75; // Outer radius boundary

let time = 0;

// --- 60 FPS FIXED TIMESTEP ACCUMULATOR LOGIC ---
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS; // ~16.66ms
let lastTime = performance.now();
let accumulator = 0;

function updateSimulation() {
    time += 0.012;

    // Comet Sequence
    if (comet.state === 'waiting') {
        comet.timer--;
        if (comet.timer <= 0) {
            resetComet();
        }
    } else if (comet.state === 'shining') {
        comet.timer++;
        if (comet.timer >= comet.shineDuration) {
            comet.state = 'shooting';
            comet.timer = 0;
            const speed = 3.8 + Math.random() * 1.4;
            const angle = Math.PI * 0.78 + (Math.random() - 0.5) * 0.1;
            comet.vx = Math.cos(angle) * speed;
            comet.vy = Math.sin(angle) * speed;
        }
    } else if (comet.state === 'shooting') {
        comet.x += comet.vx;
        comet.y += comet.vy;
        comet.timer++;

        if (comet.timer >= comet.shootDuration) {
            comet.state = 'waiting';
            comet.timer = 30 + Math.floor(Math.random() * 60);
        }
    }
}

// Helper function to calculate full sky/galaxy color at any point (x, y)
function getSkyColor(x, y, mainVortexAngle, starGlowMap) {
    const normY = y / V_HEIGHT;

    // Atmosphere
    const wave1 = Math.sin(x * 0.025 + time * 1.2 + normY * 2.5);
    const wave2 = Math.cos(x * 0.015 - time * 0.8 + normY * 1.8);
    const combinedWave = (wave1 + wave2) * 0.5;
    const waveGlow = combinedWave * (normY * normY) * 12.0;

    let r = 6 + normY * 60 + waveGlow * 0.6;
    let g = 5 + normY * 38 + waveGlow * 0.4;
    let b = 16 + normY * 120 + waveGlow * 1.2;

    // Spiral Galaxy
    const dx = x - GALAXY_CX;
    const dy = (y - GALAXY_CY) * 2.3;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < GALAXY_RADIUS) {
        const normDist = dist / GALAXY_RADIUS;
        const angle = Math.atan2(dy, dx) - mainVortexAngle;
        const edgeAlpha = Math.pow(Math.cos(normDist * Math.PI * 0.5), 1.8);

        const ambientAngle = angle * 2 - Math.log(dist + 1) * 2.0;
        const backingHaze = (Math.cos(ambientAngle) * 0.5 + 0.5) * Math.exp(-normDist * 1.5) * 0.28;

        const armDensity = Math.cos(angle * 2 - Math.log(dist + 1) * 3.5);
        const armGlow = Math.max(0, armDensity) * Math.exp(-normDist * 1.8) * 0.45;
        const coreGlow = Math.exp(-normDist * 8.0) * 1.6;

        let armR, armG, armB;
        if (normDist < 0.4) {
            const t = normDist / 0.4;
            armR = 20 + t * (160 - 20);
            armG = 100 + t * (50 - 100);
            armB = 255 + t * (220 - 255);
        } else {
            const t = (normDist - 0.4) / 0.6;
            armR = 160 + t * (240 - 160);
            armG = 50 + t * (70 - 50);
            armB = 220 + t * (160 - 220);
        }

        const totalSpiralGlow = (armGlow + backingHaze) * edgeAlpha;
        r += totalSpiralGlow * armR;
        g += totalSpiralGlow * armG;
        b += totalSpiralGlow * armB;

        const totalCoreGlow = coreGlow * edgeAlpha;
        r += totalCoreGlow * 255;
        g += totalCoreGlow * 240;
        b += totalCoreGlow * 220;
    }

    // Starfield & Comet glow
    const pixelIndex = y * V_WIDTH + x;
    const starVal = starGlowMap[pixelIndex];
    if (starVal > 0) {
        r += starVal * 0.9;
        g += starVal * 0.95;
        b += starVal * 1.0;
    }

    return { r, g, b };
}

function renderFrame() {
    const starGlowMap = new Float32Array(V_WIDTH * V_HEIGHT);

    // 1. Calculate Tiny 1px Background Stars Twinkle
    for (let i = 0; i < tinyStars.length; i++) {
        const s = tinyStars[i];
        const twinkle = Math.sin(time * s.speed + s.phase) * 0.5 + 0.5;
        const brightness = twinkle * 120;
        const idx = s.y * V_WIDTH + s.x;
        if (idx >= 0 && idx < starGlowMap.length) starGlowMap[idx] += brightness;
    }

    // 2. Calculate 4-Point Cross Stars (✦) Twinkle & Draw Cross Pattern
    for (let i = 0; i < crossStars.length; i++) {
        const s = crossStars[i];
        const twinkle = Math.sin(time * s.speed + s.phase) * 0.5 + 0.5;

        const coreBrightness = 140 + twinkle * 115;
        const armBrightness = twinkle * 130;

        const cx = s.x;
        const cy = s.y;

        if (cx >= 0 && cx < V_WIDTH && cy >= 0 && cy < V_HEIGHT) {
            starGlowMap[cy * V_WIDTH + cx] += coreBrightness;
        }
        if (cy - 1 >= 0) starGlowMap[(cy - 1) * V_WIDTH + cx] += armBrightness;
        if (cy + 1 < V_HEIGHT) starGlowMap[(cy + 1) * V_WIDTH + cx] += armBrightness;
        if (cx - 1 >= 0) starGlowMap[cy * V_WIDTH + (cx - 1)] += armBrightness;
        if (cx + 1 < V_WIDTH) starGlowMap[cy * V_WIDTH + (cx + 1)] += armBrightness;
    }

    // 3. Render Comet (Phase 1: Shining Star -> Phase 2: Falling Tail)
    if (comet.state === 'shining') {
        const progress = comet.timer / comet.shineDuration;
        const shineIntensity = Math.sin(progress * Math.PI) * 230;
        const cx = Math.floor(comet.x);
        const cy = Math.floor(comet.y);

        if (cx >= 0 && cx < V_WIDTH && cy >= 0 && cy < V_HEIGHT) {
            starGlowMap[cy * V_WIDTH + cx] += shineIntensity;
        }
        if (cx - 1 >= 0) starGlowMap[cy * V_WIDTH + (cx - 1)] += shineIntensity * 0.35;
        if (cx + 1 < V_WIDTH) starGlowMap[cy * V_WIDTH + (cx + 1)] += shineIntensity * 0.35;
        if (cy - 1 >= 0) starGlowMap[(cy - 1) * V_WIDTH + cx] += shineIntensity * 0.35;
        if (cy + 1 < V_HEIGHT) starGlowMap[(cy + 1) * V_WIDTH + cx] += shineIntensity * 0.35;

    } else if (comet.state === 'shooting') {
        const fade = Math.sin((comet.timer / comet.shootDuration) * Math.PI);
        const speedMag = Math.sqrt(comet.vx * comet.vx + comet.vy * comet.vy);
        const dirX = comet.vx / speedMag;
        const dirY = comet.vy / speedMag;

        for (let step = 0; step < comet.length; step++) {
            const tailX = Math.floor(comet.x - dirX * step);
            const tailY = Math.floor(comet.y - dirY * step);

            if (tailX >= 0 && tailX < V_WIDTH && tailY >= 0 && tailY < V_HEIGHT) {
                const tailAlpha = (1 - (step / comet.length)) * fade * 220;
                starGlowMap[tailY * V_WIDTH + tailX] += tailAlpha;
            }
        }
    }

    // Reversed Vortex Rotation Angle (-time)
    const mainVortexAngle = -time * 0.45;

    // Render Sky + Flat Mountains + Wavy Ocean Mirror Reflections
    for (let y = 0; y < V_HEIGHT; y++) {
        for (let x = 0; x < V_WIDTH; x++) {
            const pixelIndex = y * V_WIDTH + x;
            const idx = pixelIndex * 4;

            const mountainTop = mountainMap[x];

            if (y >= HORIZON_Y) {
                const waterDepth = (y - HORIZON_Y) / (V_HEIGHT - HORIZON_Y);

                const waveDistortion = Math.sin(x * 0.12 + time * 2.0 + (y - HORIZON_Y) * 0.25) * (1.2 + waterDepth * 2.5);
                const sampleX = Math.min(V_WIDTH - 1, Math.max(0, Math.floor(x + waveDistortion)));

                // Exact vertical mirror calculation seamlessly offset by -1 to eliminate horizon seam
                const mirrorY = Math.max(0, Math.floor(HORIZON_Y - 1 - (y - HORIZON_Y)));
                const sampleMountainTop = mountainMap[sampleX];

                const baseWaterR = 4 + waterDepth * 8;
                const baseWaterG = 8 + waterDepth * 14;
                const baseWaterB = 26 + waterDepth * 40;

                let r = baseWaterR,
                    g = baseWaterG,
                    b = baseWaterB;
                const reflectOpacity = 0.38 * (1.0 - waterDepth * 0.4);

                if (mirrorY >= sampleMountainTop && mirrorY < HORIZON_Y) {
                    const depthNorm = (mirrorY - sampleMountainTop) / (HORIZON_Y - sampleMountainTop);
                    const mR = 8 + depthNorm * 10;
                    const mG = 6 + depthNorm * 8;
                    const mB = 24 + depthNorm * 18;

                    r = baseWaterR + mR * reflectOpacity;
                    g = baseWaterG + mG * reflectOpacity;
                    b = baseWaterB + mB * reflectOpacity;

                    if (mirrorY - sampleMountainTop < 1.0) {
                        r += 6;
                        g += 4;
                        b += 12;
                    }
                } else if (mirrorY >= 0 && mirrorY < sampleMountainTop) {
                    const skyCol = getSkyColor(sampleX, mirrorY, mainVortexAngle, starGlowMap);
                    r = baseWaterR + skyCol.r * reflectOpacity * 0.75;
                    g = baseWaterG + skyCol.g * reflectOpacity * 0.8;
                    b = baseWaterB + skyCol.b * reflectOpacity * 0.9;
                }

                r = Math.min(255, Math.max(0, r));
                g = Math.min(255, Math.max(0, g));
                b = Math.min(255, Math.max(0, b));

                // RETRO CHECKERBOARD DITHER ENGINE
                const isDitherTile = (x + y) % 2 === 0;
                const ditherOffset = isDitherTile ? 4 : -4;

                data[idx] = Math.round(Math.min(255, Math.max(0, r + ditherOffset)) / 16) * 16;
                data[idx + 1] = Math.round(Math.min(255, Math.max(0, g + ditherOffset)) / 16) * 16;
                data[idx + 2] = Math.round(Math.min(255, Math.max(0, b + ditherOffset)) / 16) * 16;
                data[idx + 3] = 255;

            } else if (y >= mountainTop) {
                const depthNorm = (y - mountainTop) / (HORIZON_Y - mountainTop);
                let r = 8 + depthNorm * 10;
                let g = 6 + depthNorm * 8;
                let b = 24 + depthNorm * 18;

                if (y - mountainTop < 1.0) {
                    r += 22;
                    g += 16;
                    b += 45;
                }

                const isDitherTile = (x + y) % 2 === 0;
                const ditherOffset = isDitherTile ? 4 : -4;

                data[idx] = Math.round(Math.min(255, Math.max(0, r + ditherOffset)) / 16) * 16;
                data[idx + 1] = Math.round(Math.min(255, Math.max(0, g + ditherOffset)) / 16) * 16;
                data[idx + 2] = Math.round(Math.min(255, Math.max(0, b + ditherOffset)) / 16) * 16;
                data[idx + 3] = 255;

            } else {
                const skyCol = getSkyColor(x, y, mainVortexAngle, starGlowMap);
                let r = Math.min(255, Math.max(0, skyCol.r));
                let g = Math.min(255, Math.max(0, skyCol.g));
                let b = Math.min(255, Math.max(0, skyCol.b));

                const isDitherTile = (x + y) % 2 === 0;
                const ditherOffset = isDitherTile ? 6 : -6;

                data[idx] = Math.round(Math.min(255, Math.max(0, r + ditherOffset)) / 16) * 16;
                data[idx + 1] = Math.round(Math.min(255, Math.max(0, g + ditherOffset)) / 16) * 16;
                data[idx + 2] = Math.round(Math.min(255, Math.max(0, b + ditherOffset)) / 16) * 16;
                data[idx + 3] = 255;
            }
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