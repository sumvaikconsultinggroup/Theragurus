import type { HallwayGeometry } from "./hallway-motion";

// Original ray/plane room shader. No models, textures or reference shaders are copied.
const vertex = `attribute vec2 aPosition; void main(){gl_Position=vec4(aPosition,0.,1.);}`;
const fragment = `
precision highp float;
uniform vec2 uSize;
uniform float uPixelRatio, uCamera, uP, uEnd, uFloor, uCeil, uHalf, uDoorW, uDoorH, uThickness;
uniform vec2 uAim, uPointer;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec2 pixel=vec2(gl_FragCoord.x/uPixelRatio,uSize.y-gl_FragCoord.y/uPixelRatio);
  vec3 eye=vec3(uPointer,uCamera-uP);
  vec3 ray=normalize(vec3(pixel-uSize*.5-uAim,uP));
  float t=(uEnd-eye.z)/ray.z; int surface=0;
  if(ray.y>.00001){float f=(uFloor-eye.y)/ray.y;if(f>0.&&f<t){t=f;surface=1;}}
  if(ray.y<-.00001){float f=(uCeil-eye.y)/ray.y;if(f>0.&&f<t){t=f;surface=2;}}
  if(abs(ray.x)>.00001){float f=((ray.x>0.?uHalf:-uHalf)-eye.x)/ray.x;if(f>0.&&f<t){t=f;surface=3;}}
  vec3 p=eye+ray*t;
  vec3 base=vec3(.13,.19,.21);
  float distanceToDoor=max(0.,uEnd-p.z);
  float illumination=pow(1./(1.+distanceToDoor/uDoorH),2.);
  float lamp=exp(-pow(p.x/(uDoorW*.8+distanceToDoor*.15),2.))*illumination;
  float corner=1.;
  if(surface==0){corner=smoothstep(0.,uDoorH*.25,min(uHalf-abs(p.x),min(p.y-uCeil,uFloor-p.y)));}
  if(surface==1||surface==2){corner=smoothstep(0.,uHalf*.3,uHalf-abs(p.x));}
  if(surface==3){corner=smoothstep(0.,(uFloor-uCeil)*.2,min(p.y-uCeil,uFloor-p.y));}
  vec3 colour=base*(.04+lamp*1.35)*mix(.38,1.,corner);
  if(surface==1){
    float gridX=abs(fract((p.x+210.)/420.)-.5)*420.;
    float gridZ=abs(fract(p.z/500.)-.5)*500.;
    float joint=1.-smoothstep(.7,2.2,min(gridX,gridZ));
    colour*=1.-joint*.32;
    // Soft white light spill at the gate — not the previous green cast.
    float reflection=exp(-pow(p.x/(uDoorW*.32+distanceToDoor*.12),2.))*exp(-distanceToDoor/(uDoorH*1.3));
    colour+=vec3(.92,.94,.96)*reflection*.46;
    colour=mix(colour,vec3(.88,.90,.92),reflection*.22);
  }
  if(surface==0){
    vec2 edge=vec2(uDoorW*.5-abs(p.x),min(p.y-(uFloor-uDoorH),uFloor-p.y));
    float door=step(0.,min(edge.x,edge.y));
    float frame=1.-smoothstep(0.,5.,min(abs(edge.x),abs(edge.y)));
    colour=mix(colour,vec3(.035,.065,.07),door);
    colour+=vec3(.15,.2,.16)*frame*step(-5.,min(edge.x,edge.y));
  }
  float fog=1.-exp(-max(t,0.)*.000075);
  colour=mix(colour,vec3(.023,.042,.046),fog*.75);
  colour+= (hash(pixel)-.5)/650.;
  gl_FragColor=vec4(pow(max(colour,vec3(0.)),vec3(.72)),1.);
}`;

export function createHallwayRoom(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
  if (!gl) return null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error("Unable to create hallway shader");
    gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) { gl.deleteShader(shader); throw new Error("Unable to compile hallway shader"); }
    return shader;
  };
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  const buffer = gl.createBuffer();
  if (!program || !buffer) return null;
  try {
    shaders.push(compile(gl.VERTEX_SHADER, vertex), compile(gl.FRAGMENT_SHADER, fragment));
    shaders.forEach(s => gl.attachShader(program, s)); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Unable to link hallway shader");
  } catch {
    shaders.forEach(s => gl.deleteShader(s)); gl.deleteProgram(program); gl.deleteBuffer(buffer); return null;
  }
  gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "aPosition");
  gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const names = ["uSize", "uPixelRatio", "uCamera", "uP", "uEnd", "uFloor", "uCeil", "uHalf", "uDoorW", "uDoorH", "uThickness", "uAim", "uPointer"];
  const uniforms = Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)]));
  return {
    draw(g: HallwayGeometry, distance: number, cx: number, cy: number, pointerX: number, pointerY: number) {
      if (gl.isContextLost()) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.round(g.width * ratio), height = Math.round(g.height * ratio);
      if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl.viewport(0, 0, width, height); }
      gl.uniform2f(uniforms.uSize, g.width, g.height);
      gl.uniform2f(uniforms.uAim, cx, cy); gl.uniform2f(uniforms.uPointer, pointerX, pointerY);
      const values = { uPixelRatio: ratio, uCamera: distance, uP: g.perspective, uEnd: g.end, uFloor: g.height * .4, uCeil: -g.height * .5, uHalf: g.width * (g.phone ? .56 : .52), uDoorW: g.doorWidth, uDoorH: g.doorHeight, uThickness: g.thickness };
      Object.entries(values).forEach(([name, value]) => gl.uniform1f(uniforms[name], value));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    dispose() { gl.deleteBuffer(buffer); shaders.forEach(s => gl.deleteShader(s)); gl.deleteProgram(program); },
  };
}
