// Replaced canvas-based particle field with a pure CSS version.
// The original `position: fixed` animated canvas caused iOS Safari to intercept
// touch events even with pointer-events:none — a known WebKit compositing bug.
// CSS pseudo-elements on ::before/::after attached to the body (via index.css)
// provide the same visual effect with zero JS and zero stacking-context issues.
export default function ParticleField() {
  return null;
}
