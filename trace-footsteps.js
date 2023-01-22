// This script renders a map of player movements over long periods of time.
// Its purpose is artistic.
const { createCanvas, loadImage } = require('canvas');
const fs = require("fs");
const { parse } = require("csv-parse");
const RandomSeed = require('random-seed');

// Put your player movement data here into this list, sorted by player then time.
const csvfile = "Data.csv"
const footprints = [];

// This SQL is no longer used by the script but gives you an idea how to sort the data.
// const sql = 'SELECT * FROM PlayerPositions ORDER BY UserIncrementingId, Timestamp';

// The edges of the image are detected in PopulateEdges().
// let minX = 999999;
// let maxX = -999999;
// let minY = 999999;
// let maxY = -999999;

const Cords = calculateMinMax({ x: 2742, y: 1159 }, 50)

console.log(Cords);

let minX = Cords.minX;
let maxX = Cords.maxX;
let minY = Cords.minY;
let maxY = Cords.maxY;

// Random seed for reproducibility of images. This affects the sorting
// of the random rainbow colors. Changing the seed will make the same
// image but with the colors randomly shuffled.
const seed = process.argv[process.argv.length - 1] || '123';
const rng = RandomSeed(seed);

// Global variables because I am a bad coder.
let players = {};
let colors = [];
const userIds = [];

// Make this number bigger to make the lines brighter.
// Set alpha too high and parts of the image will be over-exposed, losing detail.
// Set alpha too low and the image will be too dark to see.
const alpha = '0.125';
let canvas, ctx;


function calculateMinMax(cods, size) {
    return {
        minX: cods.x - size,
        maxX: cods.x + size,
        minY: cods.y - size,
        maxY: cods.y + size
    };
}

// Find the edges of the image and count the number of distinct players.
function PopulateEdges(footprints) {
    console.log('Finding the edges of the image and counting how many distinct players.');
    for (const row of footprints) {
	const x = row.x;
	const y = row.y;
    // Commented for the use of calculateMinMax.
	// minX = Math.min(x, minX);
	// minY = Math.min(y, minY);
	// maxX = Math.max(x, maxX);
	// maxY = Math.max(y, maxY);
	players[row.user_incrementing_id] = 1;
    }
    console.log(`Found ${Object.keys(players).length} distinct players.`);
}

function SetStrokeColor(color) {
    const [r, g, b] = color;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function InterpolateTwoColors(a, b, ratio) {
    const [ar, ag, ab] = a;
    const [br, bg, bb] = b;
    const r = ratio;
    return [
	Math.floor(r * br + (1 - r) * ar),
	Math.floor(r * bg + (1 - r) * ag),
	Math.floor(r * bb + (1 - r) * ab),
    ];
}

// Start the colors at yellow instead of the customary red.
const rainbowColors = [
    [255, 255, 0],  // Yellow
    [0, 255, 0],    // Green
    [0, 255, 255],  // Cyan
    [0, 0, 255],    // Blue
    [255, 0, 255],  // Violet
    [255, 0, 0],    // Red
    [255, 128, 0],  // Orange
];

// p is a number between [0, 1].
function InterpolateRainbowColor(p) {
    const n = rainbowColors.length;
    const realColorIndex = p * n;
    const colorIndex = Math.floor(realColorIndex);
    const remainder = realColorIndex - colorIndex;
    const nextColorIndex = (colorIndex + 1) % n;
    const color = rainbowColors[colorIndex];
    const nextColor = rainbowColors[nextColorIndex];
    return InterpolateTwoColors(color, nextColor, remainder);
}

// Generates a list of bright colors equally spaced from around the color wheel.
function GenerateRainbowColors(n) {
    const colors = [];
    for (let i = 0; i < n; i++) {
	const p = i / n;
	const c = InterpolateRainbowColor(p);
	colors.push(c);
    }
    return colors;
}

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 *
 * Copied from StackOverflow.
 */
function Shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
	j = Math.floor(rng.random() * (i + 1));
	x = a[i];
	a[i] = a[j];
	a[j] = x;
    }
    return a;
}

// Draws The Line
function DrawLine(x1, y1, x2, y2, color) {
    const [r, g, b] = color;
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

// Can't use Math.sign(x) because Math.sign(0) === 0.
const sgn = x => x < 0 ? -1 : 1;

// Clamps a number to be between 0 and 1.
const clamp = x => Math.min(Math.max(x, 0), 1);

// Draw paths traced by different players onto the canvas.
function Retrace(footprints) {
    let prev;
    for (const row of footprints) {
	const userId = row.user_incrementing_id;
	if (!userIds.includes(userId)) {
	    userIds.push(userId);
	}
	const playerIndex = userIds.indexOf(userId);
	const color = colors[playerIndex];
	SetStrokeColor(color);
	if (!row.x || !row.y) {
	    continue;
	}
	if (Math.abs(row.x) < 0.001 && Math.abs(row.y) < 0.001) {
	    continue;
	}
	if (!prev) {
	    ctx.beginPath();
	    ctx.moveTo(row.x, row.y);
	} else if (prev.user_incrementing_id === userId) {
	    const dx = row.x - prev.x;
	    const dy = row.y - prev.y;
	    const dist = Math.sqrt(dx * dx + dy * dy);
	    if (dist < 30) {
            DrawLine(
		    canvas.width * (prev.x - minX) / (maxX - minX),
		    canvas.height * (maxY - prev.y) / (maxY - minY),
		    canvas.width * (row.x - minX) / (maxX - minX),
		    canvas.height * (maxY - row.y) / (maxY - minY),
		    colors[playerIndex],
		);
	    }
	}
	prev = row;
    }
}

function newMain() {
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvfile)
        .pipe(parse({ delimiter: ',', from_line: 2 }))
        .on('data', async function (row) {
            // console.log(row);
            const newItem = {
                x: parseFloat(row[0]),
                y: parseFloat(row[1]),
                user_incrementing_id: parseInt(row[2]),
            };
            footprints.push(newItem);
        }).on('end', function () {
            resolve(footprints );
          })
          .on('error', function (error) {
            reject(error.message);
          });
    });
}

newMain().then(footprints => {
    console.log(`${footprints.length} footprints received.`);
    PopulateEdges(footprints);
    console.log(minX, minY, maxX, maxY);
    const numColors = Object.keys(players).length;
    colors = GenerateRainbowColors(numColors);
    Shuffle(colors);
    canvas = createCanvas(1920, 1080);  // 1080p resolution with no border.
    //canvas = createCanvas(5160, 4200);  // 20x16 inches at 240 DPI with 3/4 inch border.
    //canvas = createCanvas(7560, 6120);  // 30x24 inches at 240 DPI with 3/4 inch border.
    ctx = canvas.getContext('2d');
    const filename = `trace-footsteps.png`;
    console.log('Rendering', filename);
    // Make the background black.
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Composite operation 'lighter' makes the image look laser-like.
    ctx.globalCompositeOperation = 'lighter';
    // Here is where the light paths are drawn.
    Retrace(footprints);
    // Output the image as a PNG file.
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filename, buffer);
});
