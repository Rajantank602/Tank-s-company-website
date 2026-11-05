import { useEffect, useRef } from 'react';
import './LightRays.css';

type LightOrigin = 'top-center' | 'top-left' | 'top-right' | 'left' | 'right' | 'bottom-center';

type LightRaysProps = {
  active: boolean;
  raysOrigin?: LightOrigin;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  intensity?: number;
  opacity?: number;
};

const vertexShader = `#version 300 es
const vec2 vertices[3] = vec2[3](
  vec2(-1.0, -1.0),
  vec2(3.0, -1.0),
  vec2(-1.0, 3.0)
);
void main() {
  gl_Position = vec4(vertices[gl_VertexID], 0.0, 1.0);
}`;

const fragmentShader = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform vec2 uSource;
uniform vec2 uDirection;
uniform vec3 uColor;
uniform float uTime;
uniform float uSpread;
uniform float uLength;
uniform float uIntensity;
uniform float uOpacity;
out vec4 outColor;
void main() {
  vec2 uv = vec2(gl_FragCoord.x / uResolution.x, 1.0 - gl_FragCoord.y / uResolution.y);
  vec2 delta = vec2((uv.x - uSource.x) * uResolution.x / uResolution.y, uv.y - uSource.y);
  float distanceFromSource = length(delta);
  vec2 direction = normalize(delta + vec2(0.00001));
  float facing = max(dot(direction, uDirection), 0.0);
  float cone = pow(facing, 1.0 / max(uSpread, 0.02));
  float reach = max(uLength, 0.1);
  float falloff = pow(max(1.0 - distanceFromSource / reach, 0.0), 1.4);
  float angle = atan(direction.x, direction.y);
  float shafts = 0.5 + 0.5 * sin(angle * 24.0 + sin(angle * 9.0) * 1.5 + uTime);
  shafts = smoothstep(0.2, 0.92, shafts);
  float glow = exp(-distanceFromSource * 5.0) * 0.55;
  float rayLight = (cone * (0.24 + shafts * 0.42) * falloff + glow) * uIntensity;
  float alpha = clamp(rayLight * uOpacity, 0.0, 0.18);
  outColor = vec4(uColor * alpha, alpha);
}`;

const origins: Record<LightOrigin, { source: [number, number]; direction: [number, number] }> = {
  'top-center': { source: [0.5, -0.04], direction: [0, 1] },
  'top-left': { source: [0.05, -0.04], direction: [0.3, 1] },
  'top-right': { source: [0.95, -0.04], direction: [-0.3, 1] },
  left: { source: [-0.04, 0.5], direction: [1, 0] },
  right: { source: [1.04, 0.5], direction: [-1, 0] },
  'bottom-center': { source: [0.5, 1.04], direction: [0, -1] },
};

function compileShader(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Unable to compile the background light shader:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function LightRaysBackground({
  active,
  raysOrigin = 'top-center',
  raysColor = '#a96b42',
  raysSpeed = 0.18,
  lightSpread = 0.42,
  rayLength = 1.2,
  intensity = 0.75,
  opacity = 0.9,
}: LightRaysProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl2', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    });
    if (!canvas || !gl) return;

    const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexShader);
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    if (!vertex || !fragment) {
      if (vertex) gl.deleteShader(vertex);
      if (fragment) gl.deleteShader(fragment);
      return;
    }

    const program = gl.createProgram();
    if (!program) {
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Unable to link the background light shader:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return;
    }

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'uResolution'),
      source: gl.getUniformLocation(program, 'uSource'),
      direction: gl.getUniformLocation(program, 'uDirection'),
      color: gl.getUniformLocation(program, 'uColor'),
      time: gl.getUniformLocation(program, 'uTime'),
      spread: gl.getUniformLocation(program, 'uSpread'),
      length: gl.getUniformLocation(program, 'uLength'),
      intensity: gl.getUniformLocation(program, 'uIntensity'),
      opacity: gl.getUniformLocation(program, 'uOpacity'),
    };
    const origin = origins[raysOrigin];
    const color = parseRgbColor(raysColor);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrame = 0;
    let elapsed = 0;
    let previousFrame = 0;
    let inViewport = true;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.round(bounds.width * ratio));
      const height = Math.max(1, Math.round(bounds.height * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
    };
    const draw = (now: number) => {
      animationFrame = 0;
      if (!active || !inViewport) return;
      const delta = previousFrame ? Math.min((now - previousFrame) / 1000, 0.05) : 0;
      previousFrame = now;
      elapsed += delta * (reducedMotion ? 0 : raysSpeed);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform2f(uniforms.source, origin.source[0], origin.source[1]);
      gl.uniform2f(uniforms.direction, origin.direction[0], origin.direction[1]);
      gl.uniform3f(uniforms.color, color[0], color[1], color[2]);
      gl.uniform1f(uniforms.time, elapsed);
      gl.uniform1f(uniforms.spread, lightSpread);
      gl.uniform1f(uniforms.length, rayLength);
      gl.uniform1f(uniforms.intensity, intensity);
      gl.uniform1f(uniforms.opacity, opacity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reducedMotion && raysSpeed > 0) animationFrame = requestAnimationFrame(draw);
    };
    const wake = () => {
      if (!active || !inViewport || animationFrame) return;
      previousFrame = 0;
      animationFrame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(() => {
      resize();
      wake();
    });
    observer.observe(canvas);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      if (!inViewport) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      } else {
        wake();
      }
    });
    visibilityObserver.observe(canvas);
    resize();
    if (active) wake();

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      visibilityObserver.disconnect();
      gl.deleteProgram(program);
    };
  }, [active, intensity, lightSpread, opacity, rayLength, raysColor, raysOrigin, raysSpeed]);

  return <canvas className="light-rays__canvas" ref={canvasRef} aria-hidden="true" />;
}

function parseRgbColor(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return [0.66, 0.42, 0.26];
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
