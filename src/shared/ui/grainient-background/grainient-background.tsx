"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/shared/lib/cn";

import styles from "./grainient-background.module.css";

const vertexShader = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// Adapted from React Bits Grainient by David Haz under the MIT + Commons Clause license.
const fragmentShader = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);return 0.5+0.5*mix(mix(dot(-1.0+2.0*hash(i),f),dot(-1.0+2.0*hash(i+vec2(1.,0.)),f-vec2(1.,0.)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.,1.)),f-vec2(0.,1.)),dot(-1.0+2.0*hash(i+vec2(1.)),f-vec2(1.)),u.x),u.y);}
void main(){
  vec2 uv=gl_FragCoord.xy/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=(uv-0.5)/0.92;
  float degree=noise(vec2(iTime*0.014,tuv.x*tuv.y)*1.55);
  tuv.y/=ratio;
  tuv*=Rot(radians((degree-0.5)*190.0+180.0));
  tuv.y*=ratio;
  tuv.x+=sin(tuv.y*3.8+iTime*0.12)/32.0;
  tuv.y+=sin(tuv.x*5.2+iTime*0.12)/18.0;
  float blendX=(tuv*Rot(radians(-12.0))).x;
  vec3 layer1=mix(uColor3,uColor2,S(-0.42,0.24,blendX));
  vec3 layer2=mix(uColor2,uColor1,S(-0.42,0.24,blendX));
  vec3 col=mix(layer1,layer2,S(0.44,-0.42,tuv.y));
  float grain=fract(sin(dot(uv*2.4,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*0.075;
  col=(col-0.5)*1.18+0.5;
  fragColor=vec4(clamp(col,0.0,1.0),1.0);
}
`;

type GrainientBackgroundProps = { className?: string; forceFallback?: boolean };

function GrainientBackground({ className, forceFallback = false }: GrainientBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || forceFallback || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false;
    let disposeRuntime: (() => void) | undefined;

    void import("ogl")
      .then(({ Mesh, Program, Renderer, Triangle }) => {
        if (disposed) return;
        let renderer: InstanceType<typeof Renderer>;
        try {
          renderer = new Renderer({
            alpha: false,
            antialias: false,
            dpr: Math.min(window.devicePixelRatio || 1, 1.25),
            webgl: 2,
          });
        } catch {
          container.dataset.grainientFallback = "true";
          return;
        }
        const gl = renderer.gl;
        const canvas = gl.canvas;
        canvas.className = styles.canvas;
        canvas.setAttribute("aria-hidden", "true");
        container.appendChild(canvas);
        const toRgb = (hex: string) => {
          const value = hex.slice(1);
          return new Float32Array([
            Number.parseInt(value.slice(0, 2), 16) / 255,
            Number.parseInt(value.slice(2, 4), 16) / 255,
            Number.parseInt(value.slice(4, 6), 16) / 255,
          ]);
        };
        const program = new Program(gl, {
          fragment: fragmentShader,
          uniforms: {
            iResolution: { value: new Float32Array([1, 1]) },
            iTime: { value: 0 },
            uColor1: { value: toRgb("#ede9fe") },
            uColor2: { value: toRgb("#8b7cf6") },
            uColor3: { value: toRgb("#172554") },
          },
          vertex: vertexShader,
        });
        const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
        const resize = () => {
          renderer.setSize(Math.max(1, container.clientWidth), Math.max(1, container.clientHeight));
          const resolution = program.uniforms.iResolution.value as Float32Array;
          resolution[0] = gl.drawingBufferWidth;
          resolution[1] = gl.drawingBufferHeight;
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();
        let visible = true;
        let rafId: number | null = null;
        const render = (time: number) => {
          rafId = null;
          if (document.hidden || !visible) return;
          program.uniforms.iTime.value = time * 0.001;
          renderer.render({ scene: mesh });
          rafId = requestAnimationFrame(render);
        };
        const resume = () => {
          if (!document.hidden && visible && rafId === null) rafId = requestAnimationFrame(render);
        };
        const observer = new IntersectionObserver(
          ([entry]) => {
            visible = Boolean(entry?.isIntersecting);
            if (!visible && rafId !== null) {
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
        observer.observe(container);
        document.addEventListener("visibilitychange", handleVisibility);
        resume();
        disposeRuntime = () => {
          if (rafId !== null) cancelAnimationFrame(rafId);
          resizeObserver.disconnect();
          observer.disconnect();
          document.removeEventListener("visibilitychange", handleVisibility);
          canvas.remove();
          gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
      })
      .catch(() => {
        container.dataset.grainientFallback = "true";
      });
    return () => {
      disposed = true;
      disposeRuntime?.();
    };
  }, [forceFallback]);

  return (
    <div
      aria-hidden="true"
      className={cn(styles.root, className)}
      data-grainient-fallback={forceFallback ? "true" : undefined}
      data-testid="grainient-background"
      ref={containerRef}
    />
  );
}

export type { GrainientBackgroundProps };
export { GrainientBackground };
