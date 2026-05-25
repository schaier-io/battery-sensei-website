import React, { useEffect, useMemo, useRef } from 'react'
import { cn } from '#/lib/utils'

export interface FrameBorderProps {
  width?: string | number
  height?: string | number
  className?: string
  children?: React.ReactNode
  speed?: number
  borderWidth?: number
  falloff?: number
  noiseScale?: number
  noiseStrength?: number
  noiseOctaves?: number
  color?: string
  backgroundColor?: string
  intensity?: number
  gamma?: number
  opacity?: number
}

const VERTEX_SHADER = `#version 300 es
in vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2  uRes;
uniform float uSpeed;
uniform float uWidth;
uniform float uCurve;
uniform float uNoiseScale;
uniform float uNoiseAmt;
uniform int   uOctaves;
uniform vec3  uColor;
uniform vec3  uBg;
uniform float uIntensity;
uniform float uGamma;
uniform float uAlpha;

out vec4 outColor;

vec2 hash22(vec2 p) {
  vec3 v = fract(p.xyx * vec3(213.897, 371.253, 517.029));
  v += dot(v, v.yzx + 97.53);
  return fract(vec2(v.x * v.z, v.y * v.z)) * 2.0 - 1.0;
}

float gnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  vec2 g00 = hash22(i);
  vec2 g10 = hash22(i + vec2(1.0, 0.0));
  vec2 g01 = hash22(i + vec2(0.0, 1.0));
  vec2 g11 = hash22(i + vec2(1.0, 1.0));

  float n00 = dot(g00, f);
  float n10 = dot(g10, f - vec2(1.0, 0.0));
  float n01 = dot(g01, f - vec2(0.0, 1.0));
  float n11 = dot(g11, f - vec2(1.0, 1.0));

  return mix(mix(n00, n10, u.x), mix(n01, n11, u.x), u.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  float angle = 0.62;
  float ca = cos(angle), sa = sin(angle);
  mat2 rot = mat2(ca, -sa, sa, ca);

  for (int i = 0; i < 6; i++) {
    if (i >= uOctaves) break;
    sum += amp * gnoise(p);
    p = rot * p * 2.13 + 147.3;
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float aspect = uRes.x / uRes.y;
  float t = uTime * uSpeed;

  float bw = uWidth;
  float bh = uWidth * aspect;

  float fx = (0.5 - abs(uv.x - 0.5)) / bw;
  float fy = (0.5 - abs(uv.y - 0.5)) / bh;

  float edge = max(1.0 - min(fx, fy), 0.0);
  edge = pow(edge, max(uCurve, 1.0));

  vec2 np = uv * uNoiseScale * vec2(1.0, 1.0 / aspect);
  float q = fbm(np + t * 0.31);
  float n = 0.5 + 0.5 * fbm(np + q * 1.7 + t * 0.17);
  n = mix(1.0, n, min(uNoiseAmt, 1.0));

  float strength = edge * n * uIntensity;
  strength = pow(max(strength, 0.0), 1.0 / uGamma);

  vec3 result = mix(uBg, uColor, clamp(strength, 0.0, 1.0));

  outColor = vec4(result, uAlpha);
}
`

function parseHexColor(hex: string): [number, number, number] {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!match) return [0, 0, 0]
  return [
    parseInt(match[1], 16) / 255,
    parseInt(match[2], 16) / 255,
    parseInt(match[3], 16) / 255,
  ]
}

function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

function linkProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram | null {
  const program = gl.createProgram()
  if (!program) return null
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    return null
  }
  return program
}

interface UniformLocations {
  uTime: WebGLUniformLocation | null
  uRes: WebGLUniformLocation | null
  uSpeed: WebGLUniformLocation | null
  uWidth: WebGLUniformLocation | null
  uCurve: WebGLUniformLocation | null
  uNoiseScale: WebGLUniformLocation | null
  uNoiseAmt: WebGLUniformLocation | null
  uOctaves: WebGLUniformLocation | null
  uColor: WebGLUniformLocation | null
  uBg: WebGLUniformLocation | null
  uIntensity: WebGLUniformLocation | null
  uGamma: WebGLUniformLocation | null
  uAlpha: WebGLUniformLocation | null
}

const FrameBorder: React.FC<FrameBorderProps> = ({
  width = '100%',
  height = '100%',
  className,
  children,
  speed = 0.1,
  borderWidth = 0.22,
  falloff = 6,
  noiseScale = 3,
  noiseStrength = 1,
  noiseOctaves = 5,
  color = '#FF9FFC',
  backgroundColor = '#000000',
  intensity = 1,
  gamma = 2,
  opacity = 1,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Latest prop values without re-running the WebGL setup. The render loop
  // reads from this ref every frame so prop changes take effect mid-anim.
  const colorRgb = useMemo(() => parseHexColor(color), [color])
  const bgRgb = useMemo(() => parseHexColor(backgroundColor), [backgroundColor])
  const propsRef = useRef({
    speed,
    borderWidth,
    falloff,
    noiseScale,
    noiseStrength,
    noiseOctaves,
    intensity,
    gamma,
    opacity,
    colorRgb,
    bgRgb,
  })
  propsRef.current = {
    speed,
    borderWidth,
    falloff,
    noiseScale,
    noiseStrength,
    noiseOctaves,
    intensity,
    gamma,
    opacity,
    colorRgb,
    bgRgb,
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true })
    if (!gl) return

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vs || !fs) return
    const program = linkProgram(gl, vs, fs)
    if (!program) return

    // Full-screen triangle. One triangle clips to the viewport faster than two
    // triangles for a quad — and there's no UV to interpolate, so no seam.
    const vbo = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const vao = gl.createVertexArray()
    gl.bindVertexArray(vao)
    const aPos = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const u: UniformLocations = {
      uTime: gl.getUniformLocation(program, 'uTime'),
      uRes: gl.getUniformLocation(program, 'uRes'),
      uSpeed: gl.getUniformLocation(program, 'uSpeed'),
      uWidth: gl.getUniformLocation(program, 'uWidth'),
      uCurve: gl.getUniformLocation(program, 'uCurve'),
      uNoiseScale: gl.getUniformLocation(program, 'uNoiseScale'),
      uNoiseAmt: gl.getUniformLocation(program, 'uNoiseAmt'),
      uOctaves: gl.getUniformLocation(program, 'uOctaves'),
      uColor: gl.getUniformLocation(program, 'uColor'),
      uBg: gl.getUniformLocation(program, 'uBg'),
      uIntensity: gl.getUniformLocation(program, 'uIntensity'),
      uGamma: gl.getUniformLocation(program, 'uGamma'),
      uAlpha: gl.getUniformLocation(program, 'uAlpha'),
    }

    gl.useProgram(program)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    let cssWidth = 0
    let cssHeight = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = container.getBoundingClientRect()
      const nextCssWidth = rect.width
      const nextCssHeight = rect.height
      if (nextCssWidth === cssWidth && nextCssHeight === cssHeight) return
      cssWidth = nextCssWidth
      cssHeight = nextCssHeight
      canvas.width = Math.max(1, Math.floor(cssWidth * dpr))
      canvas.height = Math.max(1, Math.floor(cssHeight * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(container)

    const start = performance.now()
    let rafId = 0
    const tick = () => {
      const p = propsRef.current
      const t = (performance.now() - start) / 1000
      gl.uniform1f(u.uTime, t)
      gl.uniform2f(u.uRes, canvas.width, canvas.height)
      gl.uniform1f(u.uSpeed, p.speed)
      gl.uniform1f(u.uWidth, p.borderWidth)
      gl.uniform1f(u.uCurve, p.falloff)
      gl.uniform1f(u.uNoiseScale, p.noiseScale)
      gl.uniform1f(u.uNoiseAmt, p.noiseStrength)
      gl.uniform1i(u.uOctaves, p.noiseOctaves)
      gl.uniform3f(u.uColor, p.colorRgb[0], p.colorRgb[1], p.colorRgb[2])
      gl.uniform3f(u.uBg, p.bgRgb[0], p.bgRgb[1], p.bgRgb[2])
      gl.uniform1f(u.uIntensity, p.intensity)
      gl.uniform1f(u.uGamma, p.gamma)
      gl.uniform1f(u.uAlpha, p.opacity)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      observer.disconnect()
      gl.deleteBuffer(vbo)
      gl.deleteVertexArray(vao)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      // Don't call WEBGL_lose_context here — React StrictMode in dev unmounts
      // then remounts on the same canvas, and a lost context is unrecoverable
      // (the second mount gets a permanently-lost context and renders nothing).
      // GC of the deleted resources + canvas detach is enough.
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden
      />
      {children && (
        <div className="pointer-events-none absolute inset-0 z-[1]">{children}</div>
      )}
    </div>
  )
}

FrameBorder.displayName = 'FrameBorder'

export default FrameBorder
