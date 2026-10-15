// WebGL-«шёлк»: волнующаяся ткань с атласным отливом и пылинками.
// Реагирует на курсор (рябь) и на прокрутку (волна сильнее, камера поднимается).
import {
  WebGLRenderer, Scene, Fog, PerspectiveCamera, Vector2, Color, PlaneGeometry,
  ShaderMaterial, DoubleSide, Mesh, BufferGeometry, BufferAttribute, PointsMaterial, Points,
} from "three";

const VERT = `
uniform float uTime; uniform vec2 uMouse; uniform float uScroll; uniform float uHover;
varying vec3 vPos; varying vec2 vUv; varying float vWave; varying vec3 vN;
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec2 mod289(vec2 x){return x-floor(x*(1./289.))*289.;}
vec3 permute(vec3 x){return mod289(((x*34.)+1.)*x);}
float snoise(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
 vec2 i=floor(v+dot(v,C.yy));vec2 x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
 vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod289(i);
 vec3 p=permute(permute(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
 vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;
 vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;
 m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
 vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}
float wave(vec2 p){
  float t=uTime*.18;
  float w=snoise(p*.35+vec2(t,t*.6))*.9;
  w+=snoise(p*.8-vec2(t*.7,-t))*.35;
  w+=sin(p.x*.6+uTime*.5+p.y*.3)*.35;
  float d=distance(p,uMouse*vec2(6.,3.5));
  w+=uHover*exp(-d*d*.35)*.9*sin(d*2.2-uTime*3.);
  return w*(1.+uScroll*1.2);
}
void main(){
  vUv=uv; vec3 p=position;
  float h=wave(p.xy); p.z+=h; vWave=h;
  float e=.05;
  vec3 tx=vec3(e,0.,wave(p.xy+vec2(e,0.))-h);
  vec3 ty=vec3(0.,e,wave(p.xy+vec2(0.,e))-h);
  vN=normalize(normalMatrix*normalize(cross(tx,ty)));
  vPos=p;
  gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
}`;

const FRAG = `
precision highp float;
uniform float uTime; uniform vec3 uBase; uniform vec3 uSheen; uniform vec3 uAccent; uniform vec3 uBg;
varying vec3 vPos; varying vec2 vUv; varying float vWave; varying vec3 vN;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
  vec3 n=normalize(vN); if(!gl_FrontFacing) n=-n;
  vec3 L=normalize(vec3(-.4,.7,.8));
  vec3 V=vec3(0.,0.,1.);
  float diff=clamp(dot(n,L),0.,1.);
  vec3 H=normalize(L+V);
  float spec=pow(clamp(dot(n,H),0.,1.),38.);
  float rim=pow(1.-clamp(dot(n,V),0.,1.),2.2);
  float irid=.5+.5*sin(vWave*2.4+vUv.x*3.+uTime*.15);
  vec3 col=uBase*(.35+diff*.75);
  col+=mix(uSheen,uAccent,irid)*rim*.55;
  col+=uSheen*spec*.6;
  col+=(hash(gl_FragCoord.xy+uTime)-.5)*.035;
  float vig=smoothstep(0.,.25,vUv.y)*smoothstep(1.,.7,vUv.y);
  col=mix(uBg,col,vig);
  gl_FragColor=vec4(col,1.);
}`;

export function createSilk(canvas, { reduced }) {
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
  } catch {
    canvas.style.display = "none";
    return null;
  }
  const small = innerWidth < 760;
  const BG = 0x0e0f12;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 2));
  renderer.setClearColor(BG, 1);

  const scene = new Scene();
  scene.fog = new Fog(BG, 6, 16);
  const camera = new PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, -1.2, 9);
  camera.lookAt(0, 0, 0);

  const u = {
    uTime: { value: 0 },
    uMouse: { value: new Vector2() },
    uScroll: { value: 0 },
    uHover: { value: 0 },
    uBase: { value: new Color("#24262d") },
    uSheen: { value: new Color("#ffe3d8") },
    uAccent: { value: new Color("#ff4b1f") },
    uBg: { value: new Color(BG) },
  };
  const seg = small ? [90, 60] : [220, 140];
  const cloth = new Mesh(new PlaneGeometry(18, 11, seg[0], seg[1]), new ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: u, side: DoubleSide }));
  cloth.rotation.x = -0.55;
  cloth.position.y = 0.2;
  scene.add(cloth);

  // Пылинки, медленно поднимаются вверх
  const N = small ? 220 : 900;
  const pos = new Float32Array(N * 3), speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 9;
    pos[i * 3 + 2] = Math.random() * 4 - 1;
    speed[i] = 0.1 + Math.random() * 0.4;
  }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute("position", new BufferAttribute(pos, 3));
  scene.add(new Points(dustGeo, new PointsMaterial({ color: 0xffd9cc, size: 0.025, transparent: true, opacity: 0.5, depthWrite: false })));

  const mouse = new Vector2(), target = new Vector2();
  let hover = 0, scroll = 0, visible = true, running = false, last = performance.now(), raf = 0;

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 1 ? 13 : 9;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);
  addEventListener("pointermove", (e) => {
    target.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    hover = 1;
  }, { passive: true });

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const k = 1 - Math.pow(0.001, dt);
    u.uTime.value += dt;
    mouse.lerp(target, k * 0.5);
    u.uMouse.value.copy(mouse);
    u.uHover.value += (hover - u.uHover.value) * k * 0.3;
    hover *= 0.995;
    u.uScroll.value += (scroll - u.uScroll.value) * k;
    cloth.rotation.z = mouse.x * 0.06;
    camera.position.x += (mouse.x * 0.6 - camera.position.x) * k * 0.3;
    camera.position.y = -1.2 + u.uScroll.value * 1.6;
    camera.lookAt(0, u.uScroll.value * 0.8, 0);
    const a = dustGeo.attributes.position.array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += speed[i] * dt * 0.4;
      if (a[i * 3 + 1] > 4.5) a[i * 3 + 1] = -4.5;
    }
    dustGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }
  const start = () => {
    if (running || reduced()) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  const still = () => {
    stop();
    u.uTime.value = 4;
    renderer.render(scene, camera);
  };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible && !document.hidden ? start() : stop();
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : visible && start()));
  reduced() ? still() : start();

  return {
    setScroll(v) {
      scroll = v;
    },
    setReduced(r) {
      r ? still() : start();
    },
  };
}
