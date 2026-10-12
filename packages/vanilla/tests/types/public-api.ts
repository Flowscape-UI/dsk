import {
  DskInput,
  DskRuler,
  DskPanZoom,
  DskCanvasMarker,
  bindCanvasWidget,
  projectCanvasPoint,
  unprojectCanvasPoint,
  resolveCanvasCamera,
  type CanvasCamera,
  type CanvasPoint,
  type CanvasTracking,
  type CanvasWidgetOptions,
  type CanvasWidgetBinding,
  type RulerOrientation,
  type RulerRange,
  type RulerGuideDetail,
  DskLayerTree,
  DskListValue,
  DskListHeader,
  DskListFooter,
  DskTreeSearch,
  type ListRenameDetail,
  type ListToggleDetail,
  type LayerReorderDetail,
  DskInputGroup,
  type InputGroupAdapter,
  DskInputHex,
  DskInputColor,
  DskInputBase,
  DskColorArea,
  DskColorHue,
  DskColorAlpha,
  DskColorEyedropper,
  DskAngle,
  DskCurve,
  createCanvasSampler,
  eyeDropperPagePseudoElements,
  kit,
  type HexFormat,
  type ColorFormat,
  type AlphaMode,
  type NumericValue,
  type Progression,
  type InputPositioning,
  type AngleUnit,
  type CurvePoints,
  type CurvePath,
  type CurveSegment,
  type CurvePoint,
  type CurvePreset,
  type CurveValue,
  type CurveNumber,
  type EyeDropperErrorDetail,
  type EyeDropperMode,
  type EyeDropperPreviewDetail,
  type EyeDropperSampler,
  type EyeDropperSampleRequest,
  type EyeDropperModeAdapter,
  type EyeDropperModeContext,
  type EyeDropperModeInfo,
  type EyeDropperSession,
  type EyeDropperPageOptions,
} from '@flowscape-ui/dsk';
import '@flowscape-ui/dsk/styles.css';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Assert<T extends true> = T;

const input = document.createElement('dsk-input');
const ruler = document.createElement('dsk-ruler');
const panZoom: DskPanZoom = document.createElement('dsk-pan-zoom');
panZoom.camera = { panX: 10, panY: 20, zoom: 2 };
panZoom.zoomBy(1.2);
panZoom.reset();
const marker: DskCanvasMarker = document.createElement('dsk-canvas-marker');
const camera: CanvasCamera = { panX: 100, panY: -40, zoom: 2 };
const tracking: CanvasTracking = { followPan: true, followZoom: false };
const point: CanvasPoint = { x: 20, y: 30 };
const widgetOptions: CanvasWidgetOptions = {
  camera,
  position: point,
  ...tracking,
};
const binding: CanvasWidgetBinding = bindCanvasWidget(
  document.createElement('div'),
  widgetOptions,
);
binding.update({ scaleWithZoom: true });
binding.dispose();
marker.camera = camera;
marker.x = 20;
marker.y = 30;
marker.followPan = true;
marker.followZoom = true;
marker.scaleWithZoom = false;
ruler.camera = resolveCanvasCamera(camera, tracking);
ruler.followPan = true;
ruler.followZoom = false;
const restoredPoint: CanvasPoint = unprojectCanvasPoint(
  projectCanvasPoint(point, camera),
  camera,
);
void restoredPoint;
ruler.camera = null;
const orientation: RulerOrientation = 'vertical-reversed';
const ranges: readonly RulerRange[] = [
  [-50, 100],
  [200, 240],
];
ruler.orientation = orientation;
ruler.zoom = 2;
ruler.guideZoom = 2;
ruler.guideOffset = -50;
ruler.offset = -100;
ruler.step = 25;
ruler.snap = 1;
ruler.highlights = ranges;
ruler.guides = [0, 100];
ruler.target = document.createElement('div');
ruler.formatLabel = (value) => `${value} px`;
ruler.refresh();
const rulerCoordinate: number = ruler.toValue(ruler.toPixel(42));
const guideDetail: RulerGuideDetail = { guides: [42], value: 42, index: 0 };
void rulerCoordinate;
void guideDetail;
const tree = document.createElement('dsk-layer-tree');
const treeSearch: DskTreeSearch = document.createElement('dsk-tree-search');
treeSearch.value = 'Frame';
tree.append(treeSearch);
const renameDetail: ListRenameDetail = { oldLabel: 'Frame', label: 'Page' };
void renameDetail;
const layer = document.createElement('dsk-list-value');
const layerHeader: DskListHeader = document.createElement('dsk-list-header');
const layerFooter: DskListFooter = document.createElement('dsk-list-footer');
layer.label = 'Frame';
layer.startRename();
const displayName: string = layer.displayName;
void displayName;
layer.open = true;
layer.disabled = false;
layer.toggle(false);
layer.append(layerHeader, layerFooter);
tree.append(layer);
tree.reorderable = true;
const reorderDetail: LayerReorderDetail = {
  oldParent: tree,
  position: 'inside',
  item: layer,
  parent: tree,
  oldIndex: 0,
  newIndex: 1,
};
void reorderDetail;
const toggleDetail: ListToggleDetail = { open: true };
void toggleDetail;
const inputGroup = document.createElement('dsk-input-group');
inputGroup.linked = true;
inputGroup.hasMixedValues = true;
const storedValues: readonly string[] = inputGroup.storedValues;
void storedValues;
inputGroup.mixedLabel = 'Multiple values';
inputGroup.mixedLabel = null;
inputGroup.append(input);
inputGroup.setMixed(input);
const mixedInput: boolean = inputGroup.isMixed(input);
const inputAdapter: InputGroupAdapter = {
  getValue: (field) => field.dataset.value ?? '',
  setValue: (field, value) => {
    field.dataset.value = value;
  },
};
inputGroup.registerInput(input, inputAdapter);
inputGroup.unregisterInput(input);
void mixedInput;
input.value = 40;
input.value = '40';
input.value = null;
input.min = 0;
input.max = '100';
input.step = 0.25;
input.keyHorizontalStep = 0.1;
input.keyHorizontalStep = '0.25';
input.keyHorizontalStep = null;
input.keyVerticalStep = 10;
input.keyVerticalStep = '0.5';
input.keyVerticalStep = undefined;
input.progression = 'logarithmic';
input.positioning = 'right';
input.loopAfterMin = true;
input.loopAfter = true;
input.selectOnFocus = true;
input.loopAfterMax = false;
input.tag = '%';
input.tagPosition = 'left';
input.tagGap = 8;
input.tagGap = '0.5em';
input.focus({ preventScroll: true });
input.addEventListener('pointerdown', (event) => {
  const pointerId: number = event.pointerId;
  void pointerId;
});

const hex = document.createElement('dsk-input-hex');
hex.hex = 1;
hex.hex = '8';
hex.hex = null;
hex.value = 'FE0000';
hex.valueAsNumber = 255;
hex.keyHorizontalStep = 2;
hex.selectOnFocus = true;
hex.src = '/custom-icon.svg';

const color = document.createElement('dsk-input-color');
color.format = 6;
color.alphaMode = 'percent';
color.alphaMode = 'hex';
color.alphaMode = null;
color.format = '8';
color.format = null;
color.hex = 8;
color.hex = 3;
color.value = '557BE880';
color.valueAsNumber = 255;
color.keyHorizontalStep = 2;
color.selectOnFocus = true;
color.src = '/custom-icon.svg';
const colorAsHex: DskInputHex = color;
void colorAsHex;

const colorArea = document.createElement('dsk-color-area');
colorArea.hue = 210;
colorArea.hue = '210';
colorArea.hue = null;
colorArea.hue = undefined;
colorArea.saturation = 50;
colorArea.saturation = '50';
colorArea.saturation = null;
colorArea.saturation = undefined;
colorArea.brightness = 80;
colorArea.brightness = '80';
colorArea.brightness = null;
colorArea.brightness = undefined;
colorArea.step = 2;
colorArea.step = '0.5';
colorArea.step = null;
colorArea.step = undefined;
colorArea.width = 240;
colorArea.width = '240';
colorArea.width = null;
colorArea.height = 180;
colorArea.height = '180';
colorArea.height = undefined;
colorArea.disabled = true;
colorArea.readOnly = false;
colorArea.id = 'accent-palette';
colorArea.className = 'custom-palette';
colorArea.style.width = '100%';
colorArea.hidden = false;
colorArea.focus({ preventScroll: true });
colorArea.onchange = (event) => {
  const changedColor: string = colorArea.color;
  const eventType: string = event.type;
  void changedColor;
  void eventType;
};
colorArea.addEventListener('pointerdown', (event) => {
  const pointerId: number = event.pointerId;
  void pointerId;
});

const hueSlider = document.createElement('dsk-color-hue');
hueSlider.hue = '360';
hueSlider.hue = null;
hueSlider.step = 0.5;
hueSlider.width = 240;
hueSlider.disabled = true;
hueSlider.onchange = () => {
  const color: string = hueSlider.color;
  void color;
};
const alphaSlider = document.createElement('dsk-color-alpha');
alphaSlider.alpha = '50';
alphaSlider.alpha = undefined;
alphaSlider.color = '#00AAFF';
alphaSlider.color = null;
alphaSlider.height = 20;
alphaSlider.readOnly = true;
const rgba: string = alphaSlider.rgba;
void rgba;

const eyedropper = document.createElement('dsk-color-eyedropper');
const editorCanvas = document.createElement('canvas');
eyedropper.source = editorCanvas;
eyedropper.source = null;
eyedropper.source = undefined;
eyedropper.setAttribute('source', '#editor-canvas');
const canvasSampler: EyeDropperSampler = createCanvasSampler(editorCanvas);
eyedropper.sampler = canvasSampler;
eyedropper.sampler = ({ x, y, size, signal }: EyeDropperSampleRequest) => {
  if (signal.aborted || x < 0 || y < 0) return null;
  return new ImageData(size, size);
};
eyedropper.sampler = async ({ size }) => new ImageData(size, size);
eyedropper.sampler = null;
eyedropper.sampler = undefined;
eyedropper.mode = 'canvas';
eyedropper.mode = 'page';
const pageOptions: EyeDropperPageOptions = {
  embedFonts: true,
  inlineImages: true,
  preserveScroll: true,
  pseudoElements: [...eyeDropperPagePseudoElements, '::-webkit-slider-thumb'],
  styleProperties: ['color', 'background-color'],
  filterStyles: (element, property, pseudo) => {
    const source: Element = element;
    const name: string = property;
    const pseudoName: string | null = pseudo;
    return (
      source.isConnected && name !== 'animation' && pseudoName !== '::after'
    );
  },
  filter: (node) => {
    const source: Node = node;
    return source.isConnected;
  },
};
eyedropper.pageOptions = pageOptions;
const currentPageOptions: Readonly<EyeDropperPageOptions> =
  eyedropper.pageOptions;
eyedropper.pageOptions = { pseudoElements: false };
eyedropper.pageOptions = { pseudoElements: [], styleProperties: [] };
eyedropper.pageOptions = null;
eyedropper.pageOptions = undefined;
void currentPageOptions;
eyedropper.mode = 'editor-engine';
eyedropper.registerMode('editor-engine', canvasSampler);
const customMode: EyeDropperModeAdapter = {
  label: 'Editor engine',
  isSupported: ({ host, document, source, signal }: EyeDropperModeContext) =>
    host.ownerDocument === document && source !== null && !signal.aborted,
  createSession: async ({ source }: EyeDropperModeContext) => {
    const session: EyeDropperSession = {
      sample: source ? createCanvasSampler(source) : () => null,
      dispose: () => {},
    };
    return session;
  },
};
eyedropper.registerMode('editor-engine', customMode);
const modeInfos: readonly EyeDropperModeInfo[] = eyedropper.modes;
const unregistered: boolean = eyedropper.unregisterMode('editor-engine');
void modeInfos;
void unregistered;
eyedropper.mode = 'custom';
eyedropper.mode = 'native';
eyedropper.mode = null;
eyedropper.mode = undefined;
eyedropper.magnifierPixels = 13;
eyedropper.magnifierPixels = '9';
eyedropper.magnifierPixels = null;
eyedropper.magnifierPixels = undefined;
const pickerMode: EyeDropperMode = eyedropper.mode;
const nativeSupported: boolean = eyedropper.nativeSupported;
void pickerMode;
void nativeSupported;
eyedropper.addEventListener('colorpreview', (event) => {
  const { color, pixels, x, y } = (
    event as CustomEvent<EyeDropperPreviewDetail>
  ).detail;
  const image: ImageData = pixels;
  const hex: string = color;
  const position: number[] = [x, y];
  void image;
  void hex;
  void position;
});
eyedropper.color = '#abc';
eyedropper.color = null;
eyedropper.color = undefined;
eyedropper.value = '#112233';
eyedropper.value = null;
eyedropper.value = undefined;
eyedropper.size = 40;
eyedropper.size = '48';
eyedropper.size = null;
eyedropper.size = undefined;
eyedropper.disabled = true;
eyedropper.id = 'accent-eyedropper';
eyedropper.className = 'custom-eyedropper';
eyedropper.hidden = false;
eyedropper.focus({ preventScroll: true });
eyedropper.blur();
const selection: Promise<string | null> = eyedropper.open();
void selection;
eyedropper.cancel();
eyedropper.onchange = (event) => {
  const color: string = eyedropper.color;
  const value: string = eyedropper.value;
  const type: string = event.type;
  void color;
  void value;
  void type;
};
eyedropper.addEventListener('pointerdown', (event) => {
  const pointerId: number = event.pointerId;
  void pointerId;
});
const pickerError: EyeDropperErrorDetail = {
  error: new Error('The native picker is unavailable.'),
};
void pickerError;

const angle = document.createElement('dsk-angle');
angle.value = 90;
angle.value = '180';
angle.value = null;
angle.value = undefined;
angle.min = 0;
angle.min = '15';
angle.min = null;
angle.min = undefined;
angle.max = 360;
angle.max = '270';
angle.max = null;
angle.max = undefined;
angle.snapAngle = 15;
angle.snapAngle = '5';
angle.snapAngle = null;
const snapDegrees: number = angle.snapAngle;
void snapDegrees;
angle.step = 5;
angle.step = '15';
angle.step = null;
angle.step = undefined;
angle.size = 240;
angle.size = '180';
angle.size = null;
angle.size = undefined;
angle.segments = 72;
angle.segments = '36';
angle.segments = null;
angle.segments = undefined;
angle.unit = 'deg';
angle.unit = 'rad';
angle.unit = 'pi';
angle.unit = 'PI';
angle.unit = 'π';
angle.unit = 'turn';
angle.unit = 'grad';
angle.unit = null;
angle.unit = undefined;
angle.color = '#557be8';
angle.color = null;
angle.color = undefined;
angle.disabled = true;
angle.readOnly = false;
angle.focus({ preventScroll: true });
angle.onchange = (event) => {
  const value: number = angle.value;
  const degrees: number = angle.degrees;
  const formatted: string = angle.formattedValue;
  const type: string = event.type;
  void value;
  void degrees;
  void formatted;
  void type;
};
angle.addEventListener('pointerdown', (event) => {
  const pointerId: number = event.pointerId;
  void pointerId;
});

const curve = document.createElement('dsk-curve');
curve.value = 'ease-in-out';
curve.value = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
curve.value = [0.42, 0, 0.58, 1] as const;
curve.value = null;
curve.value = undefined;
curve.points = [0.25, 0, 0.75, 1];
const segment: CurveSegment = [0.25, 0, 0.75, 1, 1, 1];
curve.segments = [segment] as const;
const path: CurvePath = curve.segments;
const nodes: readonly CurvePoint[] = curve.nodes;
curve.activePoint = 0;
curve.start = [0.1, 0.2] as const;
curve.end = [0.9, 0.8] as const;
const start: [number, number] = curve.start;
const end: [number, number] = curve.end;
path.start = [0.1, 0.2];
curve.segments = path;
void start;
void end;
void path;
void nodes;
curve.step = 0.05;
curve.step = '0.1';
curve.step = null;
curve.step = undefined;
curve.duration = 800;
curve.duration = '1600';
curve.duration = null;
curve.duration = undefined;
curve.width = 320;
curve.width = '400';
curve.width = null;
curve.width = undefined;
curve.color = '#ff8877';
curve.color = null;
curve.color = undefined;
curve.grid = false;
curve.disabled = true;
curve.readOnly = false;
curve.focus({ preventScroll: true });
curve.play();
curve.stop();
curve.onchange = (event) => {
  const points: CurvePoints = curve.points;
  const preset: CurvePreset | 'custom' = curve.preset;
  const cssValue: string = curve.cssValue;
  const type: string = event.type;
  void points;
  void preset;
  void cssValue;
  void type;
};
curve.addEventListener('pointerdown', (event) => {
  const pointerId: number = event.pointerId;
  void pointerId;
});

// Consumers can build typed subclasses without importing private source paths.
class BinaryInput extends DskInputBase {
  protected override parseValue(value: NumericValue): number {
    if (typeof value === 'number') return value;
    return /^[01]+$/.test(value ?? '') ? Number.parseInt(value!, 2) : NaN;
  }

  protected override formatValue(value: number): string {
    return Number.isInteger(value) && value >= 0 ? value.toString(2) : '';
  }

  protected override evaluateValue(text: string): number {
    return this.parseValue(text);
  }
}
customElements.define('example-binary-input', BinaryInput);

// Compile against the built package without development export conditions.
// Exact checks prevent missing declarations from silently degrading to any.
export type PublicApiChecks = [
  Assert<Equal<typeof ruler, DskRuler>>,
  Assert<Equal<DskRuler['highlights'], readonly RulerRange[]>>,
  Assert<Equal<DskRuler['guides'], readonly number[]>>,
  Assert<Equal<typeof tree, DskLayerTree>>,
  Assert<Equal<DskLayerTree['reorderable'], boolean>>,
  Assert<Equal<typeof layer, DskListValue>>,
  Assert<Equal<DskLayerTree['visibleItems'], readonly DskListValue[]>>,
  Assert<Equal<DskListValue['items'], readonly DskListValue[]>>,
  Assert<Equal<typeof inputGroup, DskInputGroup>>,
  Assert<Equal<DskInputGroup['inputs'], readonly HTMLElement[]>>,
  Assert<Equal<DskInputGroup['values'], readonly (string | null)[]>>,
  Assert<Equal<DskInputGroup['linked'], boolean>>,
  Assert<Equal<typeof eyedropper, DskColorEyedropper>>,
  Assert<Equal<DskColorEyedropper['color'], string>>,
  Assert<Equal<DskColorEyedropper['value'], string>>,
  Assert<Equal<DskColorEyedropper['size'], number>>,
  Assert<Equal<DskColorEyedropper['disabled'], boolean>>,
  Assert<Equal<DskColorEyedropper['supported'], boolean>>,
  Assert<Equal<DskColorEyedropper['picking'], boolean>>,
  Assert<Equal<DskColorEyedropper['source'], HTMLCanvasElement | null>>,
  Assert<Equal<DskColorEyedropper['sampler'], EyeDropperSampler | null>>,
  Assert<
    Equal<DskColorEyedropper['pageOptions'], Readonly<EyeDropperPageOptions>>
  >,
  Assert<Equal<typeof eyeDropperPagePseudoElements, readonly string[]>>,
  Assert<Equal<ReturnType<typeof createCanvasSampler>, EyeDropperSampler>>,
  Assert<Equal<EyeDropperSampleRequest['signal'], AbortSignal>>,
  Assert<Equal<EyeDropperSampleRequest['size'], number>>,
  Assert<Equal<DskColorEyedropper['mode'], EyeDropperMode>>,
  Assert<Equal<EyeDropperMode, string>>,
  Assert<Equal<DskColorEyedropper['modes'], readonly EyeDropperModeInfo[]>>,
  Assert<Equal<ReturnType<DskColorEyedropper['registerMode']>, void>>,
  Assert<Equal<ReturnType<DskColorEyedropper['unregisterMode']>, boolean>>,
  Assert<Equal<EyeDropperModeContext['host'], HTMLElement>>,
  Assert<Equal<EyeDropperModeContext['source'], HTMLCanvasElement | null>>,
  Assert<Equal<EyeDropperModeContext['signal'], AbortSignal>>,
  Assert<Equal<EyeDropperSession['sample'], EyeDropperSampler>>,
  Assert<Equal<ReturnType<DskColorEyedropper['open']>, Promise<string | null>>>,
  Assert<Equal<ReturnType<DskColorEyedropper['cancel']>, void>>,
  Assert<Equal<EyeDropperErrorDetail['error'], Error>>,
  Assert<Equal<DskColorEyedropper extends DskInputBase ? true : false, false>>,
  Assert<Equal<typeof curve, DskCurve>>,
  Assert<Equal<DskCurve['value'], string>>,
  Assert<Equal<DskCurve['cssValue'], string>>,
  Assert<Equal<DskCurve['points'], CurvePoints>>,
  Assert<Equal<CurvePoints, [number, number, number, number]>>,
  Assert<
    Equal<
      CurvePreset,
      'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out'
    >
  >,
  Assert<Equal<CurveValue, string | Readonly<CurvePoints> | null | undefined>>,
  Assert<Equal<CurveNumber, number | string | null | undefined>>,
  Assert<Equal<DskCurve['preset'], CurvePreset | 'custom'>>,
  Assert<Equal<DskCurve['step'], number>>,
  Assert<Equal<DskCurve['duration'], number>>,
  Assert<Equal<DskCurve['width'], number>>,
  Assert<Equal<DskCurve['color'], string>>,
  Assert<Equal<DskCurve['grid'], boolean>>,
  Assert<Equal<DskCurve['disabled'], boolean>>,
  Assert<Equal<DskCurve['readOnly'], boolean>>,
  Assert<Equal<DskCurve extends DskInputBase ? true : false, false>>,
  Assert<Equal<typeof angle, DskAngle>>,
  Assert<Equal<DskAngle['value'], number>>,
  Assert<Equal<DskAngle['min'], number>>,
  Assert<Equal<DskAngle['max'], number>>,
  Assert<Equal<DskAngle['step'], number>>,
  Assert<Equal<DskAngle['size'], number>>,
  Assert<Equal<DskAngle['segments'], number>>,
  Assert<Equal<DskAngle['unit'], AngleUnit>>,
  Assert<Equal<AngleUnit, 'deg' | 'rad' | 'pi' | 'turn' | 'grad'>>,
  Assert<Equal<DskAngle['color'], string>>,
  Assert<Equal<DskAngle['degrees'], number>>,
  Assert<Equal<DskAngle['formattedValue'], string>>,
  Assert<Equal<DskAngle['disabled'], boolean>>,
  Assert<Equal<DskAngle['readOnly'], boolean>>,
  Assert<Equal<DskAngle extends DskInputBase ? true : false, false>>,
  Assert<Equal<typeof hueSlider, DskColorHue>>,
  Assert<Equal<typeof alphaSlider, DskColorAlpha>>,
  Assert<Equal<DskColorHue['hue'], number>>,
  Assert<Equal<DskColorAlpha['alpha'], number>>,
  Assert<Equal<DskColorAlpha['rgba'], string>>,
  Assert<Equal<DskColorHue extends DskInputBase ? true : false, false>>,
  Assert<Equal<DskColorAlpha extends DskInputBase ? true : false, false>>,
  Assert<Equal<typeof input, DskInput>>,
  Assert<Equal<typeof hex, DskInputHex>>,
  Assert<Equal<typeof color, DskInputColor>>,
  Assert<Equal<typeof colorArea, DskColorArea>>,
  Assert<Equal<DskColorArea extends DskInputBase ? true : false, false>>,
  Assert<Equal<DskColorArea['hue'], number>>,
  Assert<Equal<DskColorArea['saturation'], number>>,
  Assert<Equal<DskColorArea['brightness'], number>>,
  Assert<Equal<DskColorArea['color'], string>>,
  Assert<Equal<DskColorArea['step'], number>>,
  Assert<Equal<DskColorArea['disabled'], boolean>>,
  Assert<Equal<DskColorArea['readOnly'], boolean>>,
  Assert<Equal<DskInputColor['format'], ColorFormat>>,
  Assert<Equal<DskInputColor['hex'], ColorFormat>>,
  Assert<Equal<DskInputColor['value'], string>>,
  Assert<Equal<DskInputColor['valueAsNumber'], number>>,
  Assert<Equal<ColorFormat, 6 | 8>>,
  Assert<Equal<DskInputColor['alphaMode'], AlphaMode>>,
  Assert<Equal<AlphaMode, 'hex' | 'percent'>>,
  Assert<Equal<DskInputHex['hex'], HexFormat>>,
  Assert<Equal<DskInputHex['value'], string>>,
  Assert<Equal<DskInputHex['valueAsNumber'], number>>,
  Assert<Equal<HexFormat, 1 | 2 | 3 | 6 | 8>>,
  Assert<Equal<DskInput['value'], string>>,
  Assert<Equal<DskInput['valueAsNumber'], number>>,
  Assert<Equal<DskInput['keyHorizontalStep'], string>>,
  Assert<Equal<DskInput['keyVerticalStep'], string>>,
  Assert<Equal<DskInput['disabled'], boolean>>,
  Assert<Equal<DskInput['selectOnFocus'], boolean>>,
  Assert<Equal<DskInput['positioning'], InputPositioning>>,
  Assert<Equal<InputPositioning, 'left' | 'center' | 'right'>>,
  Assert<Equal<Progression, 'linear' | 'exponential' | 'logarithmic'>>,
  Assert<Equal<typeof kit.name, 'Design System Kit'>>,
];
