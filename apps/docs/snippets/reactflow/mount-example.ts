import { createElement, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  useNodesState,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { createExampleShell } from '../shared/example-shell.ts';
import { EngineErrorBoundary } from '../shared/engine-error-boundary.ts';
import {
  createNodes,
  nodeTypes,
  rectangleId,
  type ShapeNode,
} from './shape-node.ts';
import './style.css';

const edges: Edge[] = [
  {
    id: 'rectangle-to-ellipse',
    source: rectangleId,
    target: 'dsk-ellipse',
    animated: true,
    style: { stroke: '#ff7bb7', strokeWidth: 2 },
  },
];

export function mountExample(root: HTMLElement, ru = false): () => void {
  const shell = createExampleShell(root, ru);
  root.classList.add('dsk-reactflow-example');
  const reactRoot = createRoot(shell.surface);
  let disposed = false;

  function Flow() {
    const [nodes, setNodes, onNodesChange] = useNodesState(createNodes(ru));
    const instance = useRef<ReactFlowInstance<ShapeNode, Edge> | null>(null);
    // Native DSK events read the latest model, not a stale React render closure.
    const currentNodes = useRef(nodes);
    currentNodes.current = nodes;

    useEffect(() => {
      shell.onTransform((field, value) => {
        const selected = currentNodes.current.filter((node) => node.selected);
        if (selected.length !== 1) return;
        const id = selected[0]?.id;
        setNodes((previous) =>
          previous.map((node) =>
            node.id !== id
              ? node
              : field === 'rotation'
                ? { ...node, data: { ...node.data, rotation: value } }
                : { ...node, position: { ...node.position, [field]: value } },
          ),
        );
      });
      shell.onAction((action) => {
        if (action === 'fit') {
          void instance.current?.fitView({ padding: 0.3, duration: 0 });
        } else if (action === 'reset') {
          setNodes(createNodes(ru));
        } else {
          setNodes((previous) =>
            previous.map((node) => ({
              ...node,
              selected: node.id === rectangleId,
            })),
          );
        }
      });
      return () => {
        shell.onTransform(() => {});
        shell.onAction(() => {});
      };
    }, [setNodes]);

    useEffect(() => {
      const selected = nodes.filter((node) => node.selected);
      const node = selected.length === 1 ? selected[0] : undefined;
      shell.setSelection(
        node
          ? {
              ...node.position,
              rotation: node.data.rotation,
              name: `${node.data.label} · ${node.id}`,
            }
          : null,
      );
      const rectangle = nodes.find((node) => node.id === rectangleId);
      if (rectangle) {
        // The body is 180 x 120. Attach the comment to its rotated bounds.
        const radians = (rectangle.data.rotation * Math.PI) / 180;
        const halfWidth =
          90 * Math.abs(Math.cos(radians)) + 60 * Math.abs(Math.sin(radians));
        const halfHeight =
          90 * Math.abs(Math.sin(radians)) + 60 * Math.abs(Math.cos(radians));
        shell.setMarker(
          rectangle.position.x + 90 + halfWidth,
          rectangle.position.y + 60 + halfHeight,
        );
      } else {
        shell.setMarker(0, 0, false);
      }
    }, [nodes]);

    return createElement(
      ReactFlow<ShapeNode, Edge>,
      {
        nodes,
        edges,
        nodeTypes,
        onNodesChange,
        colorMode: 'dark',
        fitView: true,
        fitViewOptions: { padding: 0.3 },
        minZoom: 0.2,
        maxZoom: 3,
        nodesConnectable: false,
        deleteKeyCode: null,
        onInit(api) {
          instance.current = api;
          const { x, y, zoom } = api.getViewport();
          shell.setCamera({ panX: x, panY: y, zoom });
          if (!disposed) root.dataset.ready = 'true';
        },
        onMove(_event, { x, y, zoom }) {
          shell.setCamera({ panX: x, panY: y, zoom });
        },
      },
      createElement(Background, {
        variant: BackgroundVariant.Dots,
        color: '#44444f',
        gap: 20,
        size: 1,
      }),
    );
  }

  reactRoot.render(
    createElement(EngineErrorBoundary, { host: root }, createElement(Flow)),
  );
  return () => {
    disposed = true;
    reactRoot.unmount();
    shell.destroy();
    root.classList.remove('dsk-reactflow-example');
    delete root.dataset.ready;
    delete root.dataset.error;
  };
}
