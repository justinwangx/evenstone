export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Jank functions to get and randomize coordinates without dropping any
// while making coordinates near the border more likely to be returned first
export function getAllCoordinates(
  xDim: number,
  yDim: number,
  blockSize: number
) {
  const coordinates_outside: Array<Array<number>> = [];
  const coordinates_inside: Array<Array<number>> = [];
  const leftCutoff = xDim * 0.2;
  const rightCutoff = xDim * 0.8;
  const topCutoff = yDim * 0.2;
  const bottomCutoff = yDim * 0.8;
  for (let i = 0; i <= xDim; i += blockSize) {
    for (let j = 0; j <= yDim; j += blockSize) {
      if (
        i < leftCutoff ||
        i > rightCutoff ||
        j < topCutoff ||
        j > bottomCutoff
      ) {
        coordinates_outside.push([i, j]);
      } else {
        coordinates_inside.push([i, j]);
      }
    }
  }
  return [
    coordinates_outside,
    coordinates_inside
  ];
}

export function randomizeCoordinates(
  borderCoordinates: Array<Array<number>>,
  insideCoordinates: Array<Array<number>>
): Array<Array<number>> {
  const randomizedCoordinates: Array<Array<number>> = [];

  while (borderCoordinates.length > 0 || insideCoordinates.length > 0) {
    const shouldSampleFromBorder =
      borderCoordinates.length > 0 &&
      (insideCoordinates.length === 0 || Math.random() < 0.60);
    const sourceCoordinates = shouldSampleFromBorder
      ? borderCoordinates
      : insideCoordinates;
    const randomIndex = Math.floor(Math.random() * sourceCoordinates.length);
    const randomCoordinate = sourceCoordinates.splice(randomIndex, 1)[0];

    randomizedCoordinates.push(randomCoordinate);
  }

  return randomizedCoordinates;
}
