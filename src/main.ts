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

// Wait for images to load
let loadedImages: HTMLImageElement[] = [];
await preloadImages();
// Choose initial image
let position = 3;
let img1 = loadedImages[position];

// Set up canvasses
const shot1Canvas = document.getElementById("shot1") as HTMLCanvasElement;
console.log(shot1Canvas);
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
background1Canvas.width = window.innerWidth;
background1Canvas.height = window.innerHeight;
background2Canvas.width = window.innerWidth;
background2Canvas.height = window.innerHeight;

// Configure block size and coordinate lists
const shotBlockSize = 3;
const backgroundBlockSize = 6;
const shotCoords = randomizeCoordinates(
  getAllCoordinates(shot1Canvas.width, shot1Canvas.height, shotBlockSize)
);
const backgroundCoords = randomizeCoordinates(
  getAllCoordinates(
    background1Canvas.width,
    background1Canvas.height,
    backgroundBlockSize
  )
);

// Draw initial image
shot1Ctx.drawImage(img1, 0, 0, shot1Canvas.width, shot1Canvas.height);
background1Ctx.drawImage(
  img1,
  0,
  0,
  background1Canvas.width,
  background1Canvas.height
);

async function animate() {
  let img1 = loadedImages[position % loadedImages.length];
  let img2 = loadedImages[(position + 1) % loadedImages.length];
  await transition(
    img1,
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
    shotBlockSize
  );
  position++;
  await sleep(5000);
  requestAnimationFrame(animate);
}

animate();
