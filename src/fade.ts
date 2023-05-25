import { sleep } from "./utils";

async function fadeOut(
  shot2: HTMLImageElement,
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement,
  context1: CanvasRenderingContext2D,
  context2: CanvasRenderingContext2D,
  coordinates: Array<Array<number>>,
  blockSize: number,
  initialSleep: number,
  laterSleep: number
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    context2.drawImage(shot2, 0, 0, canvas2.width, canvas2.height);
    const image = context1.getImageData(0, 0, canvas1.width, canvas1.height);
    const image2 = context2.getImageData(0, 0, canvas1.width, canvas1.height);

    // Modify pixel values for given block
    for (let b = 0; b < coordinates.length; b++) {
      let [x_0, y_0] = coordinates[b];
      for (let x = x_0; x < x_0 + blockSize; x++) {
        for (let y = y_0; y < y_0 + blockSize; y++) {
          let a_idx = y * 4 * canvas1.width + (x * 4 + 3);
          image.data[a_idx] = 0;
        }
      }

      if (b < coordinates.length / 4 && b % 25 === 0) {
        context1.putImageData(image, 0, 0);
        await sleep(initialSleep);
      } else if (b % 25 == 0) {
        context1.putImageData(image, 0, 0);
        await sleep(laterSleep);
      }
    }
    context1.putImageData(image2, 0, 0);
    resolve();
  });
}

export function transition(
  img1: HTMLImageElement,
  img2: HTMLImageElement,
  background1Canvas: HTMLCanvasElement,
  background2Canvas: HTMLCanvasElement,
  background1Ctx: CanvasRenderingContext2D,
  background2Ctx: CanvasRenderingContext2D,
  shot1Canvas: HTMLCanvasElement,
  shot2Canvas: HTMLCanvasElement,
  shot1Ctx: CanvasRenderingContext2D,
  shot2Ctx: CanvasRenderingContext2D,
  backgroundCoords: Array<Array<number>>,
  backgroundBlockSize: number,
  shotCoords: Array<Array<number>>,
  shotBlockSize: number,
  backgroundInitialSleep: number,
  backgroundLaterSleep: number,
  shotInitialSleep: number,
  shotLaterSleep: number
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      await Promise.all([
        fadeOut(
          img2,
          background1Canvas,
          background2Canvas,
          background1Ctx,
          background2Ctx,
          backgroundCoords,
          backgroundBlockSize,
          backgroundInitialSleep,
          backgroundLaterSleep
        ),
        fadeOut(
          img2,
          shot1Canvas,
          shot2Canvas,
          shot1Ctx,
          shot2Ctx,
          shotCoords,
          shotBlockSize,
          shotInitialSleep,
          shotLaterSleep
        )
      ]);

      resolve();
    } catch (error) {
      console.log("Error during transition", error);
      reject(error);
    }
  });
}

export function transitionNew(
  img1: HTMLImageElement,
  img2: HTMLImageElement,
  background1Canvas: HTMLCanvasElement,
  background2Canvas: HTMLCanvasElement,
  background1Ctx: CanvasRenderingContext2D,
  background2Ctx: CanvasRenderingContext2D,
  shot1Canvas: HTMLCanvasElement,
  shot2Canvas: HTMLCanvasElement,
  shot1Ctx: CanvasRenderingContext2D,
  shot2Ctx: CanvasRenderingContext2D,
  backgroundCoords: Array<Array<number>>,
  backgroundBlockSize: number,
  shotCoords: Array<Array<number>>,
  shotBlockSize: number,
  backgroundInitialSleep: number,
  backgroundLaterSleep: number,
  shotInitialSleep: number,
  shotLaterSleep: number
): Promise<void> {
  return new Promise(async (resolve, reject) => {
    shot2Ctx.drawImage(img2, 0, 0, shot2Canvas.width, shot2Canvas.height);
    background2Ctx.drawImage(img2, 0, 0, background2Canvas.width, background2Canvas.height);
    const image1 = shot1Ctx.getImageData(0, 0, shot1Canvas.width, shot1Canvas.height);
    const image2 = shot2Ctx.getImageData(0, 0, shot2Canvas.width, shot2Canvas.height);
    const bg1 = background1Ctx.getImageData(0, 0, background1Canvas.width, background1Canvas.height);
    const bg2 = background2Ctx.getImageData(0, 0, background2Canvas.width, background2Canvas.height);

    // Modify pixel values for given block
    for (let b = 0; b < shotCoords.length; b++) {
      let [x_0, y_0] = shotCoords[b];
      for (let x = x_0; x < x_0 + shotBlockSize; x++) {
        for (let y = y_0; y < y_0 + shotBlockSize; y++) {
          let a_idx = y * 4 * shot1Canvas.width + (x * 4 + 3);
          image1.data[a_idx] = 0;
          bg1.data[a_idx] = 0;
        }
      }

      if (b < shotCoords.length / 2 && b % 25 === 0) {
        shot1Ctx.putImageData(image1, 0, 0);
        background1Ctx.putImageData(bg1, 0, 0);
        await sleep(shotInitialSleep);
      } else if (b % 50 == 0) {
        shot1Ctx.putImageData(image1, 0, 0);
        background1Ctx.putImageData(bg1, 0, 0);
        await sleep(shotLaterSleep);
      }
    }
    shot1Ctx.putImageData(image2, 0, 0);
    background1Ctx.putImageData(bg2, 0, 0);
    resolve();
  }); 
}