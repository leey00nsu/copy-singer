"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/shared/lib/cn";

const vertexShader = /* glsl */ `
  precision highp float;
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

// Adapted from React Bits Orb by David Haz under the MIT + Commons Clause license.
const fragmentShader = /* glsl */ `
  precision highp float;
  uniform float iTime;
  uniform vec3 iResolution;
  uniform float hue;
  uniform float hover;
  uniform float rot;
  uniform float hoverIntensity;
  uniform vec3 backgroundColor;
  varying vec2 vUv;

  vec3 rgb2yiq(vec3 c) {
    return vec3(dot(c, vec3(0.299, 0.587, 0.114)), dot(c, vec3(0.596, -0.274, -0.322)), dot(c, vec3(0.211, -0.523, 0.312)));
  }

  vec3 yiq2rgb(vec3 c) {
    return vec3(c.x + 0.956 * c.y + 0.621 * c.z, c.x - 0.272 * c.y - 0.647 * c.z, c.x - 1.106 * c.y + 1.703 * c.z);
  }

  vec3 adjustHue(vec3 color, float hueDeg) {
    float hueRad = hueDeg * 3.14159265 / 180.0;
    vec3 yiq = rgb2yiq(color);
    float cosA = cos(hueRad);
    float sinA = sin(hueRad);
    float i = yiq.y * cosA - yiq.z * sinA;
    float q = yiq.y * sinA + yiq.z * cosA;
    yiq.y = i;
    yiq.z = q;
    return yiq2rgb(yiq);
  }

  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(p3.x + p3.y, p3.x + p3.z, p3.y + p3.z) * p3.zyx);
  }

  float snoise3(vec3 p) {
    const float K1 = 0.333333333;
    const float K2 = 0.166666667;
    vec3 i = floor(p + (p.x + p.y + p.z) * K1);
    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);
    vec3 e = step(vec3(0.0), d0 - d0.yzx);
    vec3 i1 = e * (1.0 - e.zxy);
    vec3 i2 = 1.0 - e.zxy * (1.0 - e);
    vec3 d1 = d0 - (i1 - K2);
    vec3 d2 = d0 - (i2 - K1);
    vec3 d3 = d0 - 0.5;
    vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
    vec4 n = h * h * h * h * vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)), dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));
    return dot(vec4(31.316), n);
  }

  float smoothMax3(vec3 colorIn) {
    const float power = 6.0;
    vec3 safeColor = max(colorIn, vec3(0.0));
    vec3 powered = pow(safeColor, vec3(power));
    return pow(powered.r + powered.g + powered.b, 1.0 / power);
  }

  vec4 extractAlpha(vec3 colorIn) {
    float a = clamp(smoothMax3(colorIn), 0.0, 1.0);
    return vec4(colorIn.rgb / max(a, 1e-4), a);
  }

  const vec3 baseColor1 = vec3(0.611765, 0.262745, 0.996078);
  const vec3 baseColor2 = vec3(0.298039, 0.760784, 0.913725);
  const vec3 baseColor3 = vec3(0.062745, 0.078431, 0.600000);
  const float innerRadius = 0.6;
  const float noiseScale = 0.65;

  float light1(float intensity, float attenuation, float dist) { return intensity / (1.0 + dist * attenuation); }
  float light2(float intensity, float attenuation, float dist) { return intensity / (1.0 + dist * dist * attenuation); }

  vec4 draw(vec2 uv) {
    vec3 color1 = adjustHue(baseColor1, hue);
    vec3 color2 = adjustHue(baseColor2, hue);
    vec3 color3 = adjustHue(baseColor3, hue);
    float ang = atan(uv.y, uv.x);
    float len = length(uv);
    float invLen = len > 0.0 ? 1.0 / len : 0.0;
    float bgLuminance = dot(backgroundColor, vec3(0.299, 0.587, 0.114));
    float n0 = snoise3(vec3(uv * noiseScale, iTime * 0.5)) * 0.5 + 0.5;
    float r0 = mix(mix(innerRadius, 1.0, 0.4), mix(innerRadius, 1.0, 0.6), n0);
    float d0 = distance(uv, (r0 * invLen) * uv);
    float v0 = light1(1.0, 6.5, d0);
    v0 *= smoothstep(r0 * 1.05, r0, len);
    float innerFade = smoothstep(r0 * 0.8, r0 * 0.95, len);
    v0 *= mix(innerFade, 1.0, bgLuminance * 0.7);
    v0 = pow(clamp(v0, 0.0, 1.0), 0.8);
    float colorWarp = snoise3(vec3(uv * 0.32, iTime * 0.1 + 7.0)) * 0.16;
    float cl = cos(ang + iTime * 1.35 + colorWarp) * 0.5 + 0.5;
    cl = 0.5 + (cl - 0.5) * 0.72;
    float a = iTime * -1.0;
    vec2 pos = vec2(cos(a), sin(a)) * r0;
    float d = distance(uv, pos);
    float v1 = light2(1.5, 5.0, d);
    v1 *= light1(1.0, 50.0, d0);
    float v2 = smoothstep(1.0, mix(innerRadius, 1.0, n0 * 0.5), len);
    float v3 = smoothstep(innerRadius, mix(innerRadius, 1.0, 0.5), len);
    vec3 colBase = mix(color1, color2, cl);
    float fadeAmount = mix(1.0, 0.1, bgLuminance);
    vec3 darkCol = mix(color3, colBase, v0);
    darkCol = clamp((darkCol + v1) * v2 * v3, 0.0, 1.0);
    vec3 lightCol = (colBase + v1) * mix(1.0, v2 * v3, fadeAmount);
    lightCol = clamp(mix(backgroundColor, lightCol, v0), 0.0, 1.0);
    return extractAlpha(mix(darkCol, lightCol, bgLuminance));
  }

  void main() {
    vec2 fragCoord = vUv * iResolution.xy;
    vec2 center = iResolution.xy * 0.5;
    float size = min(iResolution.x, iResolution.y);
    vec2 uv = (fragCoord - center) / size * 2.0;
    float s = sin(rot);
    float c = cos(rot);
    uv = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);
    uv.x += hover * hoverIntensity * 0.1 * sin(uv.y * 10.0 + iTime);
    uv.y += hover * hoverIntensity * 0.1 * sin(uv.x * 10.0 + iTime);
    vec4 col = draw(uv);
    float edgeMask = 1.0 - smoothstep(0.76, 0.9, length(uv));
    float alpha = col.a * edgeMask;
    gl_FragColor = vec4(col.rgb, alpha);
  }
`;

const ORB_MOTION_SPEED_SCALE = 0.5;

type VoiceOrbProps = {
  backgroundColor?: string;
  className?: string;
  forceFallback?: boolean;
  hoverIntensity?: number;
  hue?: number;
  rotateOnHover?: boolean;
  speed?: number;
};

function VoiceOrb({
  backgroundColor = "#ffffff",
  className,
  forceFallback = false,
  hoverIntensity = 0,
  hue = 294,
  rotateOnHover = false,
  speed = 1,
}: VoiceOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectiveSpeed = speed * ORB_MOTION_SPEED_SCALE;
  const speedRef = useRef(effectiveSpeed);

  useEffect(() => {
    speedRef.current = effectiveSpeed;
  }, [effectiveSpeed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || forceFallback || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let disposed = false;
    let disposeRuntime: (() => void) | undefined;

    void import("ogl")
      .then(({ Mesh, Program, Renderer, Triangle, Vec3 }) => {
        if (disposed) return;

        let renderer: InstanceType<typeof Renderer>;
        try {
          renderer = new Renderer({ alpha: true, dpr: Math.min(window.devicePixelRatio || 1, 1.5) });
        } catch {
          container.dataset.orbFallback = "true";
          return;
        }

        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        gl.canvas.className = "voice-orb-canvas";
        gl.canvas.setAttribute("aria-hidden", "true");
        container.appendChild(gl.canvas);

        const hexToVec3 = (color: string) => {
          const value = color.startsWith("#") ? color.slice(1) : "fafafa";
          return new Vec3(
            Number.parseInt(value.slice(0, 2), 16) / 255,
            Number.parseInt(value.slice(2, 4), 16) / 255,
            Number.parseInt(value.slice(4, 6), 16) / 255,
          );
        };
        const geometry = new Triangle(gl);
        const program = new Program(gl, {
          fragment: fragmentShader,
          uniforms: {
            backgroundColor: { value: hexToVec3(backgroundColor) },
            hover: { value: 0 },
            hoverIntensity: { value: hoverIntensity },
            hue: { value: hue },
            iResolution: { value: new Vec3(1, 1, 1) },
            iTime: { value: 0 },
            rot: { value: 0 },
          },
          vertex: vertexShader,
        });
        const mesh = new Mesh(gl, { geometry, program });

        const resize = () => {
          const width = Math.max(1, container.clientWidth);
          const height = Math.max(1, container.clientHeight);
          renderer.setSize(width, height);
          program.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        let inViewport = true;
        let rafId: number | null = null;
        let currentRotation = 0;
        let lastTime = 0;

        const render = (time: number) => {
          rafId = null;
          if (document.hidden || !inViewport) return;
          const delta = (time - lastTime) * 0.001;
          lastTime = time;
          program.uniforms.iTime.value = time * 0.001 * speedRef.current;
          if (rotateOnHover && program.uniforms.hover.value > 0.5) {
            currentRotation += delta * 0.3 * ORB_MOTION_SPEED_SCALE;
          }
          program.uniforms.rot.value = currentRotation;
          renderer.render({ scene: mesh });
          if (container.dataset.orbReady !== "true") container.dataset.orbReady = "true";
          rafId = requestAnimationFrame(render);
        };
        const resume = () => {
          if (!document.hidden && inViewport && rafId === null) rafId = requestAnimationFrame(render);
        };
        const intersectionObserver = new IntersectionObserver(
          ([entry]) => {
            inViewport = Boolean(entry?.isIntersecting);
            if (!inViewport && rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
            resume();
          },
          { rootMargin: "120px" },
        );
        const handleVisibility = () => {
          if (document.hidden && rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
          }
          resume();
        };
        const handleContextLost = (event: Event) => {
          event.preventDefault();
          container.dataset.orbFallback = "true";
          delete container.dataset.orbReady;
          if (rafId !== null) cancelAnimationFrame(rafId);
          rafId = null;
        };

        intersectionObserver.observe(container);
        document.addEventListener("visibilitychange", handleVisibility);
        gl.canvas.addEventListener("webglcontextlost", handleContextLost);
        resume();

        disposeRuntime = () => {
          if (rafId !== null) cancelAnimationFrame(rafId);
          resizeObserver.disconnect();
          intersectionObserver.disconnect();
          document.removeEventListener("visibilitychange", handleVisibility);
          gl.canvas.removeEventListener("webglcontextlost", handleContextLost);
          gl.canvas.remove();
          delete container.dataset.orbReady;
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
      })
      .catch(() => {
        container.dataset.orbFallback = "true";
      });

    return () => {
      disposed = true;
      disposeRuntime?.();
    };
  }, [backgroundColor, forceFallback, hoverIntensity, hue, rotateOnHover]);

  return (
    <div
      aria-hidden="true"
      className={cn("voice-orb", className)}
      data-orb-effective-speed={effectiveSpeed}
      data-orb-fallback={forceFallback ? "true" : undefined}
      data-orb-motion-scale={ORB_MOTION_SPEED_SCALE}
      data-testid="voice-orb"
      ref={containerRef}
    >
      <span className="voice-orb-fallback" />
    </div>
  );
}

export type { VoiceOrbProps };
export { VoiceOrb };
