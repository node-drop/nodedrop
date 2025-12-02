import { XYPosition } from '@xyflow/react';

export enum ControlDirection {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

export interface ControlPointData extends XYPosition {
  id: string;
  direction: ControlDirection;
  active: boolean;
  prev?: string;
}
