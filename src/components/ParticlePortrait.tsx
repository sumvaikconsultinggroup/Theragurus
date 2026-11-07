"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import "./ParticlePortrait.css";

// Original image-sampled point field. No third-party component source is used.
const vertex = `
attribute vec2 home;
attribute vec4 shade;
uniform float burst, time, size, pointerPower, aspect;
uniform vec2 pointer;
varying vec4 color;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  float seed=hash(home);
  vec2 d=home-pointer; d.x*=aspect;
  float influence=exp(-dot(d,d)*28.)*pointerPower;
  float angle=sin(home.y*5.+time*.7)*2.+cos(home.x*6.-time*.5)*1.5+seed*.4;
  vec2 spiral=vec2(cos(angle),sin(angle));
  vec2 tangent=vec2(-d.y,d.x)/(length(d)+.08);
  vec2 offset=spiral*burst*(.025+seed*.10)+tangent*influence*.12;
  offset.x/=aspect;
  gl_Position=vec4(home+offset,0.,1.);
  gl_PointSize=size*(1.+burst*.25);
  color=shade;
}`;
const fragment = `
precision mediump float;
varying vec4 color;
void main(){float d=length(gl_PointCoord-.5);gl_FragColor=vec4(color.rgb,color.a*(1.-smoothstep(.35,.5,d)));}
`;

export function ParticlePortrait({ src, alt }: { src: string; alt: string }) {
  const button = useRef<HTMLButtonElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const replay = useRef<() => void>(() => {});

  useEffect(() => {
    const host = button.current;
    const surface = canvas.current;
    if (!host || !surface) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let dispose = () => {};
    const setup = () => {
      dispose();
      if (reduced.matches) return;
      const gl = surface.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false });
      if (!gl) return;
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, source); gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); return null; }
        return shader;
      };
      const vs = compile(gl.VERTEX_SHADER, vertex), fs = compile(gl.FRAGMENT_SHADER, fragment);
      if (!vs || !fs) { if (vs) gl.deleteShader(vs); if (fs) gl.deleteShader(fs); return; }
      const program = gl.createProgram()!;
      gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs); return;
      }
      gl.useProgram(program);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      const uniforms = Object.fromEntries(["burst", "time", "size", "pointerPower", "aspect", "pointer"].map(n => [n, gl.getUniformLocation(program, n)]));
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      for (const [name, length, offset] of [["home", 2, 0], ["shade", 4, 8]] as const) {
        const location = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, length, gl.FLOAT, false, 24, offset);
      }
      let dead = false, ready = false, visible = false, count = 0, frame = 0, started = -10000, moved = -10000;
      let entered = false, px = 5, py = 5;
      const image = new window.Image();
      const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };
      const render = (now: number) => {
        frame = 0;
        if (dead || !ready || !visible || document.hidden) return;
        const age = now - started;
        const spread = age < 850 ? smooth(age / 850) : 1 - smooth((age - 850) / 1800);
        const local = 1 - smooth((now - moved) / 900);
        const activity = Math.max(age >= 0 ? spread : 0, local);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (activity < .001 && age > 2650) { delete host.dataset.particles; return; }
        host.dataset.particles = "active";
        // Reveal points without abruptly replacing the original photograph.
        host.style.setProperty("--particle-reveal", String(Math.min(1, activity * 7)));
        gl.uniform1f(uniforms.burst, Math.max(0, spread));
        gl.uniform1f(uniforms.time, now / 1000);
        gl.uniform1f(uniforms.pointerPower, local);
        gl.uniform2f(uniforms.pointer, px, py);
        gl.drawArrays(gl.POINTS, 0, count);
        frame = requestAnimationFrame(render);
      };
      const wake = () => { if (!frame && visible && ready && !document.hidden) frame = requestAnimationFrame(render); };
      replay.current = () => { if (!ready || !visible) return; started = performance.now(); wake(); };
      const rebuild = () => {
        if (dead || !image.naturalWidth) return;
        const w = host.clientWidth, h = host.clientHeight;
        if (!w || !h) return;
        const gutter = window.innerWidth <= 760 ? 0 : .08;
        const cw = w * (1 + gutter * 2), ch = h * (1 + gutter * 2), dpr = Math.min(devicePixelRatio || 1, 2);
        surface.width = Math.round(cw * dpr); surface.height = Math.round(ch * dpr);
        gl.viewport(0, 0, surface.width, surface.height);
        const fit = Math.min(w / image.naturalWidth, h / image.naturalHeight);
        const iw = image.naturalWidth * fit, ih = image.naturalHeight * fit;
        const sample = document.createElement("canvas");
        const ratio = Math.min(1, (w < 600 ? 360 : 460) / iw);
        sample.width = Math.max(1, Math.round(iw * ratio)); sample.height = Math.max(1, Math.round(ih * ratio));
        const ctx = sample.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(image, 0, 0, sample.width, sample.height);
        const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
        const points: number[] = [];
        for (let y = 0; y < sample.height; y += 1) for (let x = 0; x < sample.width; x += 1) {
          const i = (y * sample.width + x) * 4;
          if (data[i + 3] < 12) continue;
          const ox = w * gutter + (w - iw) / 2 + (x + .5) / sample.width * iw;
          const oy = h * gutter + h - ih + (y + .5) / sample.height * ih;
          points.push(ox / cw * 2 - 1, 1 - oy / ch * 2, data[i] / 255, data[i + 1] / 255, data[i + 2] / 255, data[i + 3] / 255);
        }
        count = points.length / 6;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);
        gl.uniform1f(uniforms.size, Math.max(1.6, iw / sample.width * 1.3) * dpr);
        gl.uniform1f(uniforms.aspect, cw / ch);
        ready = true;
        if (visible && !entered) { entered = true; replay.current(); }
      };
      image.onload = rebuild;
      image.src = src;
      const resize = new ResizeObserver(rebuild); resize.observe(host);
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) { cancelAnimationFrame(frame); frame = 0; delete host.dataset.particles; }
        else if (ready && !entered) { entered = true; replay.current(); }
      }, { threshold: .25 }); observer.observe(host);
      const move = (event: PointerEvent) => {
        if (event.pointerType !== "mouse") return;
        const rect = surface.getBoundingClientRect();
        px = (event.clientX - rect.left) / rect.width * 2 - 1;
        py = 1 - (event.clientY - rect.top) / rect.height * 2;
        moved = performance.now(); wake();
      };
      const enter = (event: PointerEvent) => { if (event.pointerType === "mouse") replay.current(); };
      const leave = () => { px = 5; py = 5; };
      const visibility = () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; delete host.dataset.particles; } };
      const contextLost = (event: Event) => { event.preventDefault(); ready = false; delete host.dataset.particles; cancelAnimationFrame(frame); frame = 0; };
      host.addEventListener("pointermove", move); host.addEventListener("pointerenter", enter); host.addEventListener("pointerleave", leave);
      document.addEventListener("visibilitychange", visibility); surface.addEventListener("webglcontextlost", contextLost);
      dispose = () => {
        dead = true; cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect();
        image.onload = null; replay.current = () => {}; delete host.dataset.particles;
        host.style.removeProperty("--particle-reveal");
        host.removeEventListener("pointermove", move); host.removeEventListener("pointerenter", enter); host.removeEventListener("pointerleave", leave);
        document.removeEventListener("visibilitychange", visibility); surface.removeEventListener("webglcontextlost", contextLost);
        gl.deleteBuffer(buffer); gl.deleteProgram(program); gl.deleteShader(vs); gl.deleteShader(fs);
      };
    };
    setup(); reduced.addEventListener("change", setup);
    return () => { dispose(); reduced.removeEventListener("change", setup); };
  }, [src]);

  return <button ref={button} type="button" className="particle-portrait" aria-label={`Animate portrait of ${alt}`} onClick={() => replay.current()}>
    <Image src={src} alt={alt} fill sizes="(min-width:900px) 45vw,90vw" />
    <canvas ref={canvas} aria-hidden="true" />
  </button>;
}
