export interface Photo {
  src: string;
  takenAt: string;
}

// EXIF DateTimeOriginal values were stored in EST (camera left on home time);
// the photos were actually shot on Diamond Head, Hawaii. These have been
// converted to HST (UTC-10) by subtracting 5 hours from the raw EXIF.
export const photos: Photo[] = [
  { src: "/pictures/es1.webp",  takenAt: "2022-12-12T16:38:25" },
  { src: "/pictures/es2.webp",  takenAt: "2022-12-13T08:53:53" },
  { src: "/pictures/es3.webp",  takenAt: "2022-12-13T18:25:00" },
  { src: "/pictures/es4.webp",  takenAt: "2022-12-13T19:16:15" },
  { src: "/pictures/es5.webp",  takenAt: "2022-12-13T08:55:13" },
  { src: "/pictures/es6.webp",  takenAt: "2022-12-13T09:17:00" },
  { src: "/pictures/es7.webp",  takenAt: "2022-12-13T09:45:31" },
  { src: "/pictures/es8.webp",  takenAt: "2022-12-13T09:56:37" },
  { src: "/pictures/es9.webp",  takenAt: "2022-12-13T10:05:36" },
  { src: "/pictures/es10.webp", takenAt: "2022-12-13T12:41:03" },
  { src: "/pictures/es11.webp", takenAt: "2022-12-13T15:25:23" },
  { src: "/pictures/es12.webp", takenAt: "2022-12-13T17:00:21" },
  { src: "/pictures/es13.webp", takenAt: "2022-12-13T17:52:46" },
  { src: "/pictures/es14.webp", takenAt: "2022-12-13T18:06:25" },
  { src: "/pictures/es15.webp", takenAt: "2022-12-13T19:12:56" },
  { src: "/pictures/es16.webp", takenAt: "2022-12-13T18:25:15" },
  { src: "/pictures/es17.webp", takenAt: "2022-12-13T18:50:20" },
  { src: "/pictures/es18.webp", takenAt: "2022-12-13T19:07:48" },
  { src: "/pictures/es19.webp", takenAt: "2022-12-13T19:08:26" },
];

export type Order = "curated" | "chronological";

const CURATED_START = 16;

export function sequence(order: Order): number[] {
  if (order === "chronological") {
    return photos
      .map((_, i) => i)
      .sort((a, b) => photos[a].takenAt.localeCompare(photos[b].takenAt));
  }
  return Array.from(
    { length: photos.length },
    (_, i) => (CURATED_START + i) % photos.length
  );
}

export function formatTime(takenAt: string): string {
  // takenAt is "YYYY-MM-DDTHH:MM:SS" (Hawaii local time)
  const [hh, mm] = takenAt.slice(11, 16).split(":");
  let h = parseInt(hh, 10);
  const period = h >= 12 ? "pm" : "am";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${mm} ${period}`;
}
