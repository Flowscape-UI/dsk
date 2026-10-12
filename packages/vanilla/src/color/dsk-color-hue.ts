import { type ColorNumber, hsvToHex } from './helpers/color-model.ts';
import { DskColorSliderBase } from './helpers/color-slider-base.ts';

export class DskColorHue extends DskColorSliderBase {
  static override readonly observedAttributes = [
    ...DskColorSliderBase.observedAttributes,
    'hue',
  ];
  protected override get channelAttribute(): 'hue' {
    return 'hue';
  }
  protected override get channelMaximum(): number {
    return 360;
  }
  protected override get channelDefault(): number {
    return 0;
  }
  protected override get channelLabel(): string {
    return 'Hue';
  }
  protected override get markerColor(): string {
    return this.color;
  }
  get hue(): number {
    return this.channelValue;
  }
  set hue(value: ColorNumber) {
    this.setNumericAttribute('hue', value);
  }
  get color(): string {
    return hsvToHex(this.hue, 100, 100);
  }
  protected override renderTrack(track: HTMLDivElement): void {
    track.style.backgroundImage =
      'linear-gradient(to right, #f00 0%, #ff0 16.6667%, #0f0 33.3333%, #0ff 50%, #00f 66.6667%, #f0f 83.3333%, #f00 100%)';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-color-hue': DskColorHue;
  }
}
