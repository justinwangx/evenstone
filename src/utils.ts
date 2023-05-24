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

export function getAllCoordinates(xDim: number, yDim: number, blockSize: number) {
  const coordinates: Array<Array<number>> = [];
  for (let i = 0; i <= xDim; i += blockSize) {
    for (let j = 0; j <= yDim; j += blockSize) {
      coordinates.push([i, j]);
    }
  }
  return coordinates;
}

// Randomize coordinates without dropping any
export function randomizeCoordinates(coordinates: Array<Array<number>>) {
  const randomizedCoordinates: Array<Array<number>> = [];
  const remainingCoordinates = [...coordinates];

  while (remainingCoordinates.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingCoordinates.length);
    const randomCoordinate = remainingCoordinates.splice(randomIndex, 1)[0];
    randomizedCoordinates.push(randomCoordinate);
  }

  return randomizedCoordinates;
}
