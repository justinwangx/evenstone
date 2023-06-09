import { animateLines, charFlicker } from "./words";
import { transition } from "./fade";
import {
  sleep,
  loadImage,
  getAllCoordinates,
  randomizeCoordinates,
} from "./utils";
import "./styles.css";

document.querySelector<HTMLDivElement>("#evenstone")!.innerHTML = `
    <div class="nav words">
      <div class="gallery-link"></div>
      <div id="about" class="about-link">about</div>
    </div>
    <div id="title-word" class="title words">even stone</div>

    <div id="about-text"></div>

    <canvas id="shot1"></canvas>
    <canvas id="shot2"></canvas>
    <div class="shot-border"></div>
    <div class="noise-1"></div>
    <div class="imperceptible-perlin"></div>
    <div class="background-noise"></div>
    <canvas id="background-image"></canvas>
    <canvas id="background-image2"></canvas>
`;

// About description
const aboutContainer = document.getElementById("about-text") as HTMLElement;
const aboutLines = [
  "even stone is a 19-photograph series of Diamond Head",
  "this project is inspired by Monet's Rouen Cathedral series",
  "these pictures were taken over the course of a day in fall 2022",
];

// Make about clickabble
const link = document.getElementById("about");
if (link != null) {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    // Disable the link
    link.style.pointerEvents = "none";

    animateLines(aboutLines, aboutContainer).then(() => {
      // Enable the link after 30 seconds
      setTimeout(() => {
        link.style.pointerEvents = "";
        link.classList.remove("disabled");
      }, 30000);
    });
  });
}

// Character flicker
charFlicker("about", 6000);
charFlicker("title-word", 12000);

// Visual art display
const images = [
  "pictures/es1.webp",
  "pictures/es2.webp",
  "pictures/es3.webp",
  "pictures/es4.webp",
  "pictures/es5.webp",
  "pictures/es6.webp",
  "pictures/es7.webp",
  "pictures/es8.webp",
  "pictures/es9.webp",
  "pictures/es10.webp",
  "pictures/es11.webp",
  "pictures/es12.webp",
  "pictures/es13.webp",
  "pictures/es14.webp",
  "pictures/es15.webp",
  "pictures/es16.webp",
  "pictures/es17.webp",
  "pictures/es18.webp",
  "pictures/es19.webp",
];

async function preloadImages() {
  const imagePromises = images.map((imageUrl) => loadImage(imageUrl));
  loadedImages = await Promise.all(imagePromises);
}

function checkImagesLoaded(): Promise<HTMLImageElement[]> {
  return new Promise((resolve) => {
    if (loadedImages.length > 0) {
      resolve(loadedImages);
    } else {
      setTimeout(() => resolve(checkImagesLoaded()), 100); // Check again after 100ms
    }
  });
}

// Load images
let loadedImages: HTMLImageElement[] = [];
preloadImages();

// Set up canvasses
const shot1Canvas = document.getElementById("shot1") as HTMLCanvasElement;
const shot1Ctx = shot1Canvas.getContext("2d", {
  willReadFrequently: true,
}) as CanvasRenderingContext2D;
const shot2Canvas = document.getElementById("shot2") as HTMLCanvasElement;
const shot2Ctx = shot2Canvas.getContext("2d", {
  willReadFrequently: true,
}) as CanvasRenderingContext2D;

const background1Canvas = document.getElementById(
  "background-image"
) as HTMLCanvasElement;
const background1Ctx = background1Canvas.getContext("2d", {
  willReadFrequently: true,
}) as CanvasRenderingContext2D;
const background2Canvas = document.getElementById(
  "background-image2"
) as HTMLCanvasElement;
const background2Ctx = background2Canvas.getContext("2d", {
  willReadFrequently: true,
}) as CanvasRenderingContext2D;

shot1Canvas.width = 436;
shot1Canvas.height = 654;
shot2Canvas.width = 436;
shot2Canvas.height = 654;
background1Canvas.width = 436;
background1Canvas.height = 654;
background2Canvas.width = 436;
background2Canvas.height = 654;

// Configure block size and coordinate lists
const shotBlockSize = 4;
const backgroundBlockSize = 4;

let [shotBorderCoords, shotInsideCoords] = getAllCoordinates(
  shot1Canvas.width,
  shot1Canvas.height,
  shotBlockSize
);
const shotCoords = randomizeCoordinates(shotBorderCoords, shotInsideCoords);

let [bgBorderCoords, bgInsideCoords] = getAllCoordinates(
  shot1Canvas.width,
  shot1Canvas.height,
  backgroundBlockSize
);
const backgroundCoords = randomizeCoordinates(bgBorderCoords, bgInsideCoords);

// Configure drawing delay
const shotInitialSleep = 50;
const shotLaterSleep = 0;
const backgroundInitialSleep = 50;
const backgroundLaterSleep = 0;

let position: number;
let img1: HTMLImageElement;

async function setup() {
  await checkImagesLoaded();
  // Choose initial image
  position = Math.floor(Math.random() * images.length);
  img1 = loadedImages[position];

  // Draw initial image
  shot1Ctx.drawImage(img1, 0, 0, shot1Canvas.width, shot1Canvas.height);
  background1Ctx.drawImage(
    img1,
    0,
    0,
    background1Canvas.width,
    background1Canvas.height
  );
}

let ready = false;

async function animate() {
  if (!ready) {
    await setup();
    ready = true;
  }

  let img2 = loadedImages[(position + 1) % loadedImages.length];
  await sleep(10000);
  await transition(
    img2,
    background1Canvas,
    background2Canvas,
    background1Ctx,
    background2Ctx,
    shot1Canvas,
    shot2Canvas,
    shot1Ctx,
    shot2Ctx,
    backgroundCoords,
    backgroundBlockSize,
    shotCoords,
    shotBlockSize,
    backgroundInitialSleep,
    backgroundLaterSleep,
    shotInitialSleep,
    shotLaterSleep
  );
  position++;
  requestAnimationFrame(animate);
}

animate();
