import { createElement } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';

export type ShapeNode = Node<
  { label: string; rotation: number; kind: 'rectangle' | 'ellipse' },
  'shape'
>;

export const rectangleId = 'dsk-rectangle';

export function createNodes(ru = false): ShapeNode[] {
  return [
    {
      id: rectangleId,
      type: 'shape',
      position: { x: 80, y: 80 },
      selected: true,
      data: {
        label: ru ? 'Прямоугольник' : 'Rectangle',
        rotation: 0,
        kind: 'rectangle',
      },
    },
    {
      id: 'dsk-ellipse',
      type: 'shape',
      position: { x: 350, y: 190 },
      data: {
        label: ru ? 'Эллипс' : 'Ellipse',
        rotation: 0,
        kind: 'ellipse',
      },
    },
  ];
}

/** Rotate the visual body, leaving the node's connection handles stable. */
export function Shape({ data, selected }: NodeProps<ShapeNode>) {
  return createElement(
    'div',
    { className: 'dsk-flow-shape' },
    createElement(Handle, { type: 'target', position: Position.Left }),
    createElement(
      'div',
      {
        className: `dsk-flow-body dsk-flow-${data.kind}${selected ? ' is-selected' : ''}`,
        style: { transform: `rotate(${data.rotation}deg)` },
      },
      createElement('span', { className: 'dsk-flow-brand' }, 'dsk'),
      createElement('span', { className: 'dsk-flow-label' }, data.label),
    ),
    createElement(Handle, { type: 'source', position: Position.Right }),
  );
}

// Stable component identities prevent remounting nodes during input changes.
export const nodeTypes = { shape: Shape };
