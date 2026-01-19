import { Point } from '../types';

export const getDistance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
};

export const getVelocity = (p1: Point, p2: Point) => {
  const dist = getDistance(p1, p2);
  const time = p2.time - p1.time;
  return time > 0 ? dist / time : 0;
};

// Linear interpolation
export const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

// Get midpoint for quadratic bezier
export const getMidPoint = (p1: Point, p2: Point): Point => {
  return {
    x: p1.x + (p2.x - p1.x) / 2,
    y: p1.y + (p2.y - p1.y) / 2,
    time: p1.time + (p2.time - p1.time) / 2,
    pressure: (p1.pressure || 0.5) + ((p2.pressure || 0.5) - (p1.pressure || 0.5)) / 2,
    pointerType: p1.pointerType // Inherit pointer type
  };
};