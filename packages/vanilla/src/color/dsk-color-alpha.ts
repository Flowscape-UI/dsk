import { type ColorNumber, normalizeRgbHex } from './helpers/color-model.ts';
import { DskColorSliderBase } from './helpers/color-slider-base.ts';

const checkerboard =
  'conic-gradient(#b8b8b8 25%, #eee 0 50%, #b8b8b8 0 75%, #eee 0)';

export class DskColorAlpha extends DskColorSliderBase {
  static override readonly observedAttributes = [
    ...DskColorSliderBase.observedAttributes,
    'alpha',
    'color',
  ];
  protected override get channelAttribute(): 'alpha' {
    return 'alpha';
  }
  protected override get channelMaximum(): number {
    return 100;
  }
  protected override get channelDefault(): number {
    return 100;
  }
  protected override get channelLabel(): string {
    return 'Opacity';
  }
  protected override get markerColor(): string {
    return this.rgba;
  }
  get alpha(): number {
    return this.channelValue;
  }
  set alpha(value: ColorNumber) {
    this.setNumericAttribute('alpha', value);
  }
  get color(): string {
    return normalizeRgbHex(this.getAttribute('color'));
  }
  set color(value: string | null | undefined) {
    if (value == null) this.removeAttribute('color');
    else this.setAttribute('color', value);
  }
  get rgba(): string {
    return (
      this.color +
      Math.round((this.alpha / 100) * 255)
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()
    );
  }
  protected override renderTrack(track: HTMLDivElement): void {
    track.style.backgroundImage = `linear-gradient(to right, ${this.color}00, ${this.color}), ${checkerboard}`;
    track.style.backgroundSize = '100% 100%, 8px 8px';
  }

  protected override renderMarker(marker: HTMLDivElement): void {
    super.renderMarker(marker);
    // Give the marker its own checkerboard, avoiding double-compositing the
    // selected alpha over the already translucent track beneath it.
    marker.style.backgroundImage = `linear-gradient(${this.rgba}, ${this.rgba}), ${checkerboard}`;
    marker.style.backgroundSize = '100% 100%, 8px 8px';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-color-alpha': DskColorAlpha;
  }
}
