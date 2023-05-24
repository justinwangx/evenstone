import { sleep } from "./utils";

async function fadeOut(
  shot2: HTMLImageElement,
  canvas1: HTMLCanvasElement,
  canvas2: HTMLCanvasElement,
  context1: CanvasRenderingContext2D,
  context2: CanvasRenderingContext2D,
  coordinates: Array<Array<number>>,
  blockSize: number
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

      if (b < coordinates.length / 3 && b % 10 === 0) {
        context1.putImageData(image, 0, 0);
        await sleep(0.000000000001);
      } else if (b % 5 == 0) {
        context1.putImageData(image, 0, 0);
        await sleep(0.000000000001);
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
  shotBlockSize: number
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
          backgroundBlockSize
        ),
        fadeOut(
          img2,
          shot1Canvas,
          shot2Canvas,
          shot1Ctx,
          shot2Ctx,
          shotCoords,
          shotBlockSize
        )
      ]);

      resolve();
    } catch (error) {
      console.log("Error during transition", error);
      reject(error);
    }
  });
}
