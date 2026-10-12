import {
  createCanvasSampler,
  type DskColorEyedropper,
} from '@flowscape-ui/dsk';

/** Example application mode, not a built-in DSK mode. */
export function registerGrayscaleMode(picker: DskColorEyedropper): () => void {
  picker.registerMode('grayscale', {
    label: 'Grayscale',
    isSupported: ({ source }) => source !== null,
    createSession: ({ source, signal }) => {
      if (!source || signal.aborted) {
        throw new DOMException('Selection canceled', 'AbortError');
      }
      const read = createCanvasSampler(source);
      return {
        sample: (request) => {
          const result = read(request);
          if (!(result instanceof ImageData)) return null;
          const pixels = result;
          if (!pixels || request.signal.aborted) return null;
          for (let i = 0; i < pixels.data.length; i += 4) {
            const gray = Math.round(
              0.2126 * pixels.data[i]! +
                0.7152 * pixels.data[i + 1]! +
                0.0722 * pixels.data[i + 2]!,
            );
            pixels.data[i] = gray;
            pixels.data[i + 1] = gray;
            pixels.data[i + 2] = gray;
          }
          return pixels;
        },
      };
    },
  });
  return () => {
    picker.unregisterMode('grayscale');
  };
}
