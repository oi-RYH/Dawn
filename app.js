import * as THREE from 'three';
import {GLTFLoader} from './vendor/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from './vendor/jsm/environments/RoomEnvironment.js';
import {RectAreaLightUniformsLib} from './vendor/jsm/lights/RectAreaLightUniformsLib.js';

const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const lerp=(from,to,amount)=>from+(to-from)*amount;
const smooth=value=>{const t=clamp(value);return t*t*(3-2*t)};
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const section=document.querySelector('#motion');
const captions=[...document.querySelectorAll('.caption')];
const dialog=document.querySelector('#release-dialog');
let hero,story,frame=0,activeCaption=-1,lastFrameTime=0,displayedAngle=110,asset;

const contentTexture=new THREE.TextureLoader().load('assets/desktop.jpg?v=tahoe-dawn-1',()=>requestFrame());
contentTexture.colorSpace=THREE.SRGBColorSpace;
contentTexture.anisotropy=4;
const settings={distortionStrength:1,maximumBlur:18,shadeStrength:.85};

function fixedContentMaterial(){
 return new THREE.ShaderMaterial({
  uniforms:{
   content:{value:contentTexture},referenceMatrix:{value:new THREE.Matrix4()},
   origin:{value:new THREE.Vector3()},extent:{value:new THREE.Vector2(1,1)},
   eye:{value:new THREE.Vector3()},angle:{value:110},
   strength:{value:settings.distortionStrength},maxBlur:{value:settings.maximumBlur},
   shade:{value:settings.shadeStrength}
  },
  vertexShader:`uniform mat4 referenceMatrix;uniform vec3 origin;uniform vec2 extent;
   varying vec2 panelUV;
   void main(){
    vec3 upright=(referenceMatrix*vec4(position,1.)).xyz;
    panelUV=(upright.xy-origin.xy)/extent;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
   }`,
  fragmentShader:`uniform sampler2D content;uniform vec3 eye,origin;uniform vec2 extent;
   uniform float angle,strength,maxBlur,shade;varying vec2 panelUV;
   vec3 samplePanel(vec2 p){
    if(p.x<0.||p.x>1.||p.y<0.||p.y>1.)return vec3(0.);
    float theta=radians(90.-(90.-clamp(angle,15.,90.))*strength);
    float h=(eye.y-origin.y)/extent.y;
    float d=max(.1,(eye.z-origin.z)/extent.y);
    float B=d*sin(theta)-h*cos(theta);
    float sourceY=p.y*B/(d-p.y*cos(theta));
    float sourceX=(p.x-.5)*(B+sourceY*cos(theta))/B+.5;
    vec2 uv=vec2(sourceX,sourceY);
    if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return vec3(0.);
    return texture2D(content,uv).rgb;
   }
   void main(){
    float y=1.-panelUV.y;
    float angularProgress=clamp((90.-angle)/75.,0.,1.);
    float radius=maxBlur*angularProgress*(1.-y)/956.;
    vec2 px=vec2(radius*extent.y/extent.x,radius);
    vec3 color=samplePanel(panelUV)*.20;
    color+=samplePanel(panelUV+vec2(px.x,0.))*.10;
    color+=samplePanel(panelUV-vec2(px.x,0.))*.10;
    color+=samplePanel(panelUV+vec2(0.,px.y))*.10;
    color+=samplePanel(panelUV-vec2(0.,px.y))*.10;
    color+=samplePanel(panelUV+px*.7071)*.075;
    color+=samplePanel(panelUV-px*.7071)*.075;
    color+=samplePanel(panelUV+vec2(px.x,-px.y)*.7071)*.075;
    color+=samplePanel(panelUV+vec2(-px.x,px.y)*.7071)*.075;
    color+=samplePanel(panelUV+px*.35)*.05;
    color+=samplePanel(panelUV-px*.35)*.05;
    float progress=clamp((90.-angle)/90.,0.,1.);
    float eased=progress*progress*(3.-2.*progress);
    float t=clamp((eased*1.45-y)/.45,0.,1.);
    float opacity=shade*t*t*(3.-2.*t);
    gl_FragColor=vec4(color,1.);
    #include <colorspace_fragment>
    gl_FragColor.rgb*=1.-opacity;
   }`
 });
}

function requestFrame(){if(!frame)frame=requestAnimationFrame(render)}
function hingeAngle(progress){
 if(progress<.08)return 110;
 if(progress<.62)return lerp(110,0,smooth((progress-.08)/.54));
 return 0;
}
function revealTilt(progress){
 if(progress<.68)return 0;
 return smooth((progress-.68)/.32);
}

// Tilt that leaves the closed lid exactly square to the line of sight, measured
// against the point the camera aims at.
function faceOnTilt(eye,focus){
 return 90-THREE.MathUtils.radToDeg(Math.atan2(eye.y-focus.y,eye.z-focus.z));
}

document.querySelectorAll('[data-download]').forEach(button=>button.addEventListener('click',()=>{location.href='Dawn.dmg'}));
document.querySelector('.close').addEventListener('click',()=>dialog.close());
document.querySelector('#dialog-done').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});

RectAreaLightUniformsLib.init();
function makeLaptop(){
 const model=asset.scene.clone(true);
 const pivot=new THREE.Group();
 pivot.add(model);
 const bounds=new THREE.Box3().setFromObject(model);
 const size=bounds.getSize(new THREE.Vector3());
 const center=bounds.getCenter(new THREE.Vector3());
 const scale=7/size.x;
 model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
 model.scale.setScalar(scale);
 let lid=null,display=null;
 let bezel=null;
 model.traverse(node=>{
  const name=(node.name||'').toLowerCase();
  if(!lid&&name.includes('lid')&&name.includes('hinge')&&name.includes('pivot'))lid=node;
  if(!display&&node.isMesh&&name.includes('screen'))display=node;
  if(!bezel&&node.isMesh&&name.includes('bezel'))bezel=node;
 });
 if(!lid)throw new Error('Dawn Air hinge node was not found.');
 if(bezel){
  bezel.material=bezel.material.clone();
  bezel.material.color.set('#07080a');
  bezel.material.metalness=0;
  bezel.material.roughness=.42;
  bezel.material.envMapIntensity=.12;
 }
 if(display){
  // The exported panel sits 3.1mm above the bezel centre, which leaves an
  // uneven border along the hinge edge. Recentre it inside the glass.
  if(bezel)display.position.z=bezel.position.z;
  display.material=fixedContentMaterial();
  lid.rotation.set(-THREE.MathUtils.degToRad(90),0,0);
  pivot.updateMatrixWorld(true);
  const screenBounds=new THREE.Box3().setFromObject(display);
  const screenSize=screenBounds.getSize(new THREE.Vector3());
  const uniforms=display.material.uniforms;
  uniforms.origin.value.set(screenBounds.min.x,screenBounds.min.y,(screenBounds.min.z+screenBounds.max.z)/2);
  uniforms.extent.value.set(screenSize.x,screenSize.y);
  uniforms.referenceMatrix.value.copy(display.matrixWorld);
 }
 lid.rotation.set(0,0,0);
 pivot.updateMatrixWorld(true);
 const closedLid=new THREE.Box3().setFromObject(lid);
 const lidCenter=closedLid.getCenter(new THREE.Vector3());
 lidCenter.y=closedLid.max.y;
 return {pivot,model,lid,display,lidCenter};
}

function sceneFor(container,dark){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 renderer.setClearColor(0,0);
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure=dark?1.04:1.16;
 container.appendChild(renderer.domElement);
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(27,1,.1,100);
 const laptop=makeLaptop();
 scene.add(laptop.pivot);
 const pmrem=new THREE.PMREMGenerator(renderer);
 const room=new RoomEnvironment();
 const environment=pmrem.fromScene(room,.03);
 scene.environment=environment.texture;
 scene.environmentIntensity=dark?.72:1;
 room.dispose();pmrem.dispose();
 const key=new THREE.RectAreaLight(0xffffff,7,13,10);key.position.set(-5,8,9);key.lookAt(0,1,0);scene.add(key);
 const rim=new THREE.RectAreaLight(0xc9d9f4,4,10,4);rim.position.set(5,5,-3);rim.lookAt(0,1,0);scene.add(rim);
 scene.add(new THREE.HemisphereLight(0xffffff,0x778294,.55));
 const resize=()=>{const width=container.clientWidth,height=container.clientHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();requestFrame()};
 new ResizeObserver(resize).observe(container);
 function draw(angle,reveal=0){
  const narrow=container.clientWidth/container.clientHeight<1.2;
  const focus=new THREE.Vector3(0,1.5,0);
  camera.position.set(0,5.6,16.6);camera.position.multiplyScalar(narrow?1.25:1);
  camera.lookAt(focus);
  const tilt=reveal*faceOnTilt(camera.position,focus);
  laptop.lid.rotation.set(-THREE.MathUtils.degToRad(angle),0,0);
  laptop.pivot.rotation.set(THREE.MathUtils.degToRad(tilt),0,0);
  const seated=laptop.lidCenter.clone().applyAxisAngle(new THREE.Vector3(1,0,0),THREE.MathUtils.degToRad(tilt));
  laptop.pivot.position.set(0,reveal*(focus.y-seated.y),reveal*(focus.z-seated.z));
  if(laptop.display){
   const uniforms=laptop.display.material.uniforms;
   uniforms.eye.value.copy(camera.position);
   uniforms.angle.value=angle;
  }
  container.dataset.angle=angle.toFixed(2);
  renderer.render(scene,camera);
 }
 return {container,draw};
}

function fallback(error){
 document.body.classList.add('no-webgl');
 document.querySelectorAll('.fallback').forEach(element=>element.hidden=false);
 console.warn('Dawn Air preview unavailable',error);
}

function render(now=performance.now()){
 frame=0;
 const delta=lastFrameTime?Math.min(50,now-lastFrameTime):1000/60;lastFrameTime=now;
 const rect=section.getBoundingClientRect();
 const progress=reduced.matches?0:clamp(-rect.top/Math.max(1,section.offsetHeight-innerHeight));
 const target=hingeAngle(progress);
 const blend=1-Math.pow(1-.22,delta/(1000/60));
 displayedAngle=reduced.matches?110:displayedAngle+(target-displayedAngle)*blend;
 if(Math.abs(target-displayedAngle)<.03)displayedAngle=target;
 if(!reduced.matches&&Math.abs(target-displayedAngle)>.03)requestFrame();
 if(hero&&hero.container.getBoundingClientRect().bottom>0)hero.draw(110);
 if(story&&rect.top<innerHeight&&rect.bottom>0)story.draw(displayedAngle,revealTilt(progress));
 const index=progress<.19?0:progress<.43?1:progress<.73?2:3;
 if(index!==activeCaption){captions.forEach((caption,i)=>caption.classList.toggle('active',i===index));activeCaption=index;}
 document.querySelector('#angle-readout').textContent=Math.round(displayedAngle);
 document.querySelector('#progress-fill').style.transform=`scaleX(${progress})`;
}

new GLTFLoader().load('assets/dawn-air.glb',gltf=>{
 asset=gltf;
 try{hero=sceneFor(document.querySelector('#hero-device'),false);story=sceneFor(document.querySelector('#motion-device'),true);requestFrame()}catch(error){fallback(error)}
},undefined,fallback);
addEventListener('scroll',requestFrame,{passive:true});
addEventListener('resize',requestFrame);
reduced.addEventListener('change',requestFrame);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestFrame()});
requestFrame();
