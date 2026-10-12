export interface UploadRejectDetail {
  files: readonly File[];
  accept: string;
  reason: 'type' | 'multiple';
}

/** Single local file picker. Selecting a file never sends it to a server. */
export class DskInputUpload extends HTMLElement {
  static readonly observedAttributes = [
    'accept',
    'disabled',
    'placeholder',
    'aria-label',
  ];
  private readonly _picker: HTMLInputElement;
  private readonly _button: HTMLButtonElement;
  private readonly _clear: HTMLButtonElement;
  private readonly _label: HTMLSpanElement;
  private readonly _icon: HTMLSpanElement;
  private readonly _status: HTMLSpanElement;
  private _file: File | null = null;
  private _url: string | undefined;
  private _listeners: AbortController | undefined;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open', delegatesFocus: true });
    root.innerHTML = `
      <style>
        :host { display:inline-block; width:var(--dsk-input-width,214px); height:var(--dsk-input-height,30px); vertical-align:middle; font:inherit; color:var(--dsk-input-color,#151922); }
        :host([hidden]) { display:none; }
        :host([disabled]) { opacity:.5; }
        [part=container] { box-sizing:border-box; display:flex; height:100%; border:var(--dsk-input-border,1px solid #a6afbf); border-radius:var(--dsk-input-border-radius,8px); background:var(--dsk-input-background,#f5f6f8); overflow:hidden; }
        [part=container]:focus-within { outline:2px solid var(--dsk-input-focus-color,#557be8); outline-offset:1px; }
        button { border:0; background:transparent; color:inherit; font:inherit; cursor:pointer; min-width:0; padding:0; }
        button:disabled { cursor:default; }
        button:hover:not(:disabled) { background:color-mix(in srgb,currentColor 6%,transparent); }
        [part=button] { display:flex; align-items:center; flex:1; gap:6px; padding:0 6px; }
        [part=icon] { display:flex; align-items:center; justify-content:center; flex:0 0 24px; height:24px; }
        svg,img { width:24px; height:24px; object-fit:cover; border-radius:3px; }
        [part=filename] { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center; font-size:var(--dsk-input-font-size,14px); }
        [part=clear] { width:26px; flex:none; font-size:18px; }
        [hidden] { display:none!important; }
        [part=status] { position:absolute; width:1px; height:1px; overflow:hidden; clip-path:inset(50%); }
      </style>
      <div part="container">
        <button part="button" type="button"><span part="icon" aria-hidden="true"></span><span part="filename"></span></button>
        <button part="clear" type="button" aria-label="Remove file" hidden>×</button>
      </div>
      <input type="file" hidden>
      <span part="status" role="status"></span>`;
    this._picker = root.querySelector('input')!;
    this._button = root.querySelector('[part=button]')!;
    this._clear = root.querySelector('[part=clear]')!;
    this._label = root.querySelector('[part=filename]')!;
    this._icon = root.querySelector('[part=icon]')!;
    this._status = root.querySelector('[part=status]')!;
  }

  get accept(): string {
    return this.getAttribute('accept') ?? '';
  }
  set accept(value: string) {
    this.setAttribute('accept', value);
  }
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(value: boolean) {
    this.toggleAttribute('disabled', value);
  }
  get placeholder(): string {
    return this.getAttribute('placeholder') ?? 'Choose a file';
  }
  set placeholder(value: string) {
    this.setAttribute('placeholder', value);
  }
  get file(): File | null {
    return this._file;
  }
  set file(value: File | null) {
    this.select(value ? [value] : [], false);
  }
  get files(): readonly File[] {
    return this._file ? [this._file] : [];
  }
  clear(): void {
    this.select([], false);
  }

  connectedCallback(): void {
    this._listeners?.abort();
    this._listeners = new AbortController();
    const options = { signal: this._listeners.signal };
    this._button.addEventListener('click', () => this._picker.click(), options);
    this._clear.addEventListener(
      'click',
      () => {
        this.select([], true);
        this._button.focus();
      },
      options,
    );
    this._picker.addEventListener(
      'change',
      (event) => {
        event.stopPropagation();
        const files = Array.from(this._picker.files ?? []);
        if (files.length) this.select(files, true);
        this._picker.value = '';
      },
      options,
    );
    this._picker.addEventListener(
      'input',
      (event) => event.stopPropagation(),
      options,
    );
    this.addEventListener(
      'dragover',
      (event) => {
        if (event.dataTransfer?.types.includes('Files')) {
          event.preventDefault();
          event.dataTransfer.dropEffect = this.disabled ? 'none' : 'copy';
        }
      },
      options,
    );
    this.addEventListener(
      'drop',
      (event) => {
        event.preventDefault();
        const files = Array.from(event.dataTransfer?.files ?? []);
        if (!this.disabled && files.length) this.select(files, true);
      },
      options,
    );
    this.render();
  }

  disconnectedCallback(): void {
    this._listeners?.abort();
    this.releasePreview();
  }

  attributeChangedCallback(): void {
    this.render();
  }

  private select(files: File[], user: boolean): void {
    if (user && this.disabled) return;
    const file = files[0] ?? null;
    const tokens = this.accept
      .toLowerCase()
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);
    const allowed =
      !file ||
      !tokens.length ||
      tokens.some((token) => {
        if (token.startsWith('.'))
          return file.name.toLowerCase().endsWith(token);
        const mime = file.type.toLowerCase();
        if (/^(image|audio|video)\/\*$/.test(token))
          return mime.startsWith(token.slice(0, -1));
        return mime !== '' && mime === token;
      });
    if (files.length > 1 || !allowed) {
      this._status.textContent =
        files.length > 1
          ? 'Choose one file at a time.'
          : 'This file type is not allowed.';
      this.dispatchEvent(
        new CustomEvent<UploadRejectDetail>('dsk-upload-reject', {
          bubbles: true,
          composed: true,
          detail: {
            files,
            accept: this.accept,
            reason: files.length > 1 ? 'multiple' : 'type',
          },
        }),
      );
      return;
    }
    if (file === this._file) return;
    this._file = file;
    this._status.textContent = file ? `Selected ${file.name}` : 'File removed.';
    this.render();
    if (user) {
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.dispatchEvent(
        new Event('change', { bubbles: true, composed: true }),
      );
    }
  }

  private releasePreview(): void {
    if (this._url) URL.revokeObjectURL(this._url);
    this._url = undefined;
  }

  private render(): void {
    this.releasePreview();
    this._picker.accept = this.accept;
    this._picker.disabled = this.disabled;
    this._button.disabled = this.disabled;
    this._clear.disabled = this.disabled;
    this._clear.hidden = !this._file;
    const name = this._file?.name ?? this.placeholder;
    this._label.textContent = name;
    this._button.title = name;
    this._button.setAttribute(
      'aria-label',
      `${this.getAttribute('aria-label') ?? 'Choose file'}: ${name}`,
    );
    this.renderIcon();
    if (
      this._file &&
      this.isConnected &&
      (this._file.type.startsWith('image/') ||
        /\.(png|jpe?g|gif|webp|avif|bmp|svg|ico)$/i.test(this._file.name))
    ) {
      const image = document.createElement('img');
      image.alt = '';
      this._url = URL.createObjectURL(this._file);
      image.src = this._url;
      image.addEventListener(
        'error',
        () => {
          if (this._icon.contains(image)) {
            this.releasePreview();
            this.renderIcon();
          }
        },
        { once: true },
      );
      this._icon.replaceChildren(image);
    }
  }

  private renderIcon(): void {
    const extension = this._file?.name.split('.').pop()?.toUpperCase() ?? '';
    const color =
      extension === 'PDF'
        ? '#e34b50'
        : /^(DOCX?|ODT|RTF)$/.test(extension)
          ? '#4385e4'
          : /^(XLSX?|CSV|ODS)$/.test(extension)
            ? '#32a875'
            : /^(PPTX?|ODP)$/.test(extension)
              ? '#e88643'
              : /^(ZIP|RAR|7Z|GZ)$/.test(extension)
                ? '#a078db'
                : '#8090aa';
    this._icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none"><path d="M5 2h9l5 5v15H5z" fill="${color}"/><path d="M14 2v6h5" stroke="white" stroke-opacity=".6"/><text x="12" y="17" text-anchor="middle" fill="white" font-family="sans-serif" font-size="6" font-weight="700"></text></svg>`;
    this._icon.querySelector('text')!.textContent = this._file
      ? extension.slice(0, 4) || 'FILE'
      : '+';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dsk-input-upload': DskInputUpload;
  }
}
