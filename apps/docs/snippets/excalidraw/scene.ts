import { convertToExcalidrawElements } from '@excalidraw/excalidraw';

export const rectangleId = 'dsk-rectangle';

/** Fresh elements also give Reset a clean, independent scene. */
export function createElements() {
  return convertToExcalidrawElements(
    [
      {
        id: rectangleId,
        type: 'rectangle',
        x: 80,
        y: 80,
        width: 180,
        height: 130,
        strokeColor: '#ff7bb7',
        backgroundColor: '#a61e68',
        fillStyle: 'solid',
        roughness: 1,
        strokeWidth: 2,
      },
      {
        id: 'dsk-ellipse',
        type: 'ellipse',
        x: 350,
        y: 170,
        width: 110,
        height: 110,
        strokeColor: '#d0bfff',
        backgroundColor: '#6741a5',
        fillStyle: 'hachure',
        roughness: 1,
        strokeWidth: 2,
      },
    ],
    { regenerateIds: false },
  );
}
