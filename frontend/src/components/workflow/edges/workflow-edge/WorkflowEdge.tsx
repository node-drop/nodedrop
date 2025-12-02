import { useState, useMemo } from 'react';
import { BaseEdge, EdgeProps, Position } from '@xyflow/react';
import { EdgeButton } from '../EdgeButton';
import {
  getStepInitialPoints,
  getStepPath,
} from './path/step';

export function WorkflowEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  sourceHandleId,
  targetHandleId,
  style = {},
  markerEnd,
}: EdgeProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate step points
  const stepPoints = useMemo(() => {
    return getStepInitialPoints({
      source: { x: sourceX, y: sourceY },
      sourcePosition,
      target: { x: targetX, y: targetY },
      targetPosition,
    });
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]);

  // Generate the path string
  const edgePath = useMemo(() => {
    return getStepPath({
      points: stepPoints,
      initialStepPoints: stepPoints as any, // XYPosition[] is compatible for path generation
    });
  }, [stepPoints]);

  // Calculate label position (midpoint of edge)
  const labelPosition = useMemo(() => {
    const midIndex = Math.floor(stepPoints.length / 2);
    const midPoint = stepPoints[midIndex];
    return {
      x: midPoint.x,
      y: midPoint.y,
    };
  }, [stepPoints]);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  return (
    <>
      {/* Main edge path */}
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />

      {/* Invisible wider path for hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
      />

      {/* Add node button */}
      {isHovered && (
        <EdgeButton
          x={labelPosition.x}
          y={labelPosition.y}
          id={id}
          source={source}
          target={target}
          sourceHandleId={sourceHandleId}
          targetHandleId={targetHandleId}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      )}
    </>
  );
}

