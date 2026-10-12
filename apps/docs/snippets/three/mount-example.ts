import {
  AmbientLight,
  Box3,
  BoxGeometry,
  BoxHelper,
  Color,
  CylinderGeometry,
  DirectionalLight,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Raycaster,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { createExampleShell } from '../shared/example-shell.ts';
import './style.css';

export function mountExample(root: HTMLElement, ru = false): () => void {
  // Create the renderer first so an unsupported WebGL context leaves no listeners.
  const renderer = new WebGLRenderer({ antialias: true });
  const shell = createExampleShell(root, ru);
  root.classList.add('dsk-three-example');
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', ru ? 'Сцена Three.js' : 'Three.js scene');
  shell.surface.append(canvas);

  const scene = new Scene();
  scene.background = new Color('#151517');
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
  const light = new DirectionalLight('#ffffff', 3);
  light.position.set(-150, 300, 700);
  scene.add(light, new AmbientLight('#ffffff', 1.5));

  const grid = new GridHelper(1600, 40, '#3c3c44', '#25252c');
  grid.rotation.x = Math.PI / 2;
  grid.position.set(400, -200, -80);
  scene.add(grid);

  const boxGeometry = new BoxGeometry(160, 110, 50);
  const puckGeometry = new CylinderGeometry(58, 58, 34, 48);
  const boxMaterial = new MeshStandardMaterial({
    color: '#ff0073',
    roughness: 0.38,
    metalness: 0.12,
  });
  const puckMaterial = new MeshStandardMaterial({
    color: '#9259ff',
    roughness: 0.45,
    metalness: 0.12,
  });
  const box = new Group();
  box.name = ru ? 'Розовый блок' : 'Pink box';
  const boxMesh = new Mesh(boxGeometry, boxMaterial);
  boxMesh.rotation.set(0.3, -0.36, 0);
  box.add(boxMesh);
  const puck = new Group();
  puck.name = ru ? 'Фиолетовый диск' : 'Purple puck';
  const puckMesh = new Mesh(puckGeometry, puckMaterial);
  puckMesh.rotation.set(Math.PI / 2 - 0.4, 0.2, 0);
  puck.add(puckMesh);
  scene.add(box, puck);
  const shapes = [box, puck];
  const selection = new BoxHelper(box, '#ffffff');
  selection.material.depthTest = false;
  selection.renderOrder = 1;
  scene.add(selection);
  let selected: Group | null = box;
  let width = 1;
  let height = 1;
  let centerX = 260;
  let centerY = 170;
  let zoom = 1;
  let disposed = false;
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const bounds = new Box3();
  const abort = new AbortController();
  const { signal } = abort;

  const render = () => {
    if (disposed) return;
    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.zoom = zoom;
    camera.position.set(centerX, -centerY, 1000);
    camera.lookAt(centerX, -centerY, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    scene.updateMatrixWorld(true);
    if (selected) {
      selection.setFromObject(selected);
      shell.setSelection({
        x: selected.position.x,
        // DSK uses downward-positive Y and clockwise degrees.
        y: -selected.position.y,
        rotation: (-selected.rotation.z * 180) / Math.PI,
        name: selected.name,
      });
    } else shell.setSelection(null);
    selection.visible = selected !== null;
    shell.setCamera({
      panX: width / 2 - centerX * zoom,
      panY: height / 2 - centerY * zoom,
      zoom,
    });
    // Attach the comment to this box, regardless of the current selection.
    bounds.setFromObject(box);
    shell.setMarker(bounds.max.x, -bounds.min.y);
    renderer.render(scene, camera);
  };

  const fit = () => {
    bounds.makeEmpty();
    for (const shape of shapes) bounds.expandByObject(shape);
    const center = bounds.getCenter(new Vector3());
    const size = bounds.getSize(new Vector3());
    centerX = center.x;
    centerY = -center.y;
    zoom = Math.max(
      0.15,
      Math.min(2, (width - 80) / size.x, (height - 100) / size.y),
    );
    render();
  };

  const reset = () => {
    box.position.set(150, -130, 0);
    box.rotation.z = -0.15;
    puck.position.set(380, -220, 0);
    puck.rotation.z = 0.35;
    selected = box;
    fit();
  };

  shell.onTransform((field, value) => {
    if (!selected || !Number.isFinite(value)) return;
    if (field === 'x') selected.position.x = value;
    if (field === 'y') selected.position.y = -value;
    if (field === 'rotation') selected.rotation.z = (-value * Math.PI) / 180;
    render();
  });
  shell.onAction((action) => {
    if (action === 'fit') fit();
    if (action === 'reset') reset();
    if (action === 'select') {
      selected = box;
      render();
    }
  });

  let drag: {
    pointerId: number;
    x: number;
    y: number;
    shape: Group | null;
  } | null = null;
  canvas.addEventListener(
    'pointerdown',
    (event) => {
      if (!event.isPrimary || (event.button !== 0 && event.button !== 1))
        return;
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      const rect = canvas.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(shapes, true)[0]?.object;
      const picked = shapes.find((shape) => shape === hit?.parent) ?? null;
      const pan = event.button === 1 || event.shiftKey;
      if (!pan) selected = picked;
      drag = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        shape: pan ? null : picked,
      };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = drag.shape ? 'grabbing' : 'move';
      render();
    },
    { signal },
  );
  canvas.addEventListener(
    'pointermove',
    (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      const dx = (event.clientX - drag.x) / zoom;
      const dy = (event.clientY - drag.y) / zoom;
      if (drag.shape) {
        drag.shape.position.x += dx;
        drag.shape.position.y -= dy;
      } else {
        centerX -= dx;
        centerY -= dy;
      }
      drag.x = event.clientX;
      drag.y = event.clientY;
      render();
    },
    { signal },
  );
  const endDrag = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    canvas.style.cursor = '';
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };
  canvas.addEventListener('pointerup', endDrag, { signal });
  canvas.addEventListener('pointercancel', endDrag, { signal });
  canvas.addEventListener('lostpointercapture', endDrag, { signal });
  canvas.addEventListener(
    'wheel',
    (event) => {
      // Leave page scrolling intact until the reader focuses the scene.
      if (document.activeElement !== canvas) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left - width / 2;
      const y = event.clientY - rect.top - height / 2;
      const previous = zoom;
      const unit =
        event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
      zoom = Math.max(
        0.15,
        Math.min(4, zoom * Math.exp(-event.deltaY * unit * 0.001)),
      );
      centerX += x / previous - x / zoom;
      centerY += y / previous - y / zoom;
      render();
    },
    { passive: false, signal },
  );
  canvas.addEventListener(
    'keydown',
    (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const step = event.shiftKey ? 10 : 1;
      if (event.key === 'Escape') selected = null;
      else if (event.key.toLowerCase() === 'f') fit();
      else if (event.key === '+' || event.key === '=')
        zoom = Math.min(4, zoom * 1.1);
      else if (event.key === '-') zoom = Math.max(0.15, zoom / 1.1);
      else if (selected && event.key === 'ArrowLeft')
        selected.position.x -= step;
      else if (selected && event.key === 'ArrowRight')
        selected.position.x += step;
      else if (selected && event.key === 'ArrowUp') selected.position.y += step;
      else if (selected && event.key === 'ArrowDown')
        selected.position.y -= step;
      else return;
      event.preventDefault();
      render();
    },
    { signal },
  );

  const resize = () => {
    width = Math.max(1, shell.surface.clientWidth);
    height = Math.max(1, shell.surface.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    render();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(shell.surface);
  resize();
  reset();
  root.dataset.ready = 'true';

  return () => {
    disposed = true;
    observer.disconnect();
    abort.abort();
    drag = null;
    boxGeometry.dispose();
    puckGeometry.dispose();
    boxMaterial.dispose();
    puckMaterial.dispose();
    grid.geometry.dispose();
    if (Array.isArray(grid.material)) grid.material.forEach((m) => m.dispose());
    else grid.material.dispose();
    selection.geometry.dispose();
    selection.material.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    shell.destroy();
    root.classList.remove('dsk-three-example');
    delete root.dataset.ready;
  };
}
