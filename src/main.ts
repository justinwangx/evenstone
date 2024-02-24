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

let loadedImages = new Array(images.length);

// Lazily load images
async function loadNextImage(index: number) {
  if (!loadedImages[index]) { // If the image isn't loaded yet
    loadedImages[index] = await loadImage(images[index]);
  }
  return loadedImages[index];
}

// Set up canvases
const setupCanvasAndContext = (id: string) => {
  const canvas = document.getElementById(id) as HTMLCanvasElement;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  canvas.width = 436;
  canvas.height = 654;
  return { canvas, ctx };
};

const { canvas: shot1Canvas, ctx: shot1Ctx } = setupCanvasAndContext("shot1");
const { canvas: shot2Canvas, ctx: shot2Ctx } = setupCanvasAndContext("shot2");
const { canvas: background1Canvas, ctx: background1Ctx } = setupCanvasAndContext("background-image");
const { canvas: background2Canvas, ctx: background2Ctx } = setupCanvasAndContext("background-image2");

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
const transitionDelay = 2000;

// Draw initial image
let position = 16; // magic number - the 16th image just looks nice
let img1 = await loadNextImage(position);
shot1Ctx.drawImage(img1, 0, 0, shot1Canvas.width, shot1Canvas.height);
background1Ctx.drawImage(
  img1,
  0,
  0,
  background1Canvas.width,
  background1Canvas.height
);

async function animate() {
  const img = await loadNextImage((position + 1) % images.length);
  position = (position + 1) % images.length;

  await sleep(transitionDelay);

  await transition(
    img,
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
