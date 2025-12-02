import React, { useCallback, useRef, useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { ControlPointData } from './ControlPoint';

interface ControlPointProps {
  controlPoint: ControlPointData;
  edgeId: string;
  onDrag: (controlPointId: string, position: { x: number; y: number }) => void;
}

export function ControlPoint({ controlPoint, onDrag }: ControlPointProps) {
  const { screenToFlowPosition } = useReactFlow();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartPos.current) return;

      const flowPosition = screenToFlowPosition({
        x: moveEvent.clientX,
        y: moveEvent.clientY,
      });

      onDrag(controlPoint.id, flowPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartPos.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [controlPoint.id, onDrag, screenToFlowPosition]);

  return (
    <g
      transform={`translate(${controlPoint.x}, ${controlPoint.y})`}
      onMouseDown={handleMouseDown}
      style={{ 
        cursor: isDragging ? 'grabbing' : 'grab',
        pointerEvents: 'all'
      }}
      className="control-point"
    >
      {/* Larger invisible hit area */}
      <circle
        r={10}
        fill="transparent"
        strokeWidth={0}
        style={{ pointerEvents: 'all' }}
      />
      {/* Visible control point */}
      <circle
        r={5}
        fill={isDragging ? '#3b82f6' : '#6366f1'}
        stroke="#fff"
        strokeWidth={2}
        className="transition-all"
        style={{ pointerEvents: 'none' }}
      />
      {/* Hover effect */}
      <circle
        r={7}
        fill="transparent"
        stroke="#6366f1"
        strokeWidth={1}
        opacity={isDragging ? 1 : 0}
        className="transition-opacity"
        style={{ pointerEvents: 'none' }}
      />
    </g>
  );
}
