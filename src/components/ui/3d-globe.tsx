"use client";
import React, { useRef, useMemo, useState, useCallback, Suspense } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export interface GlobeMarker {
  lat: number;
  lng: number;
  src: string;
  label?: string;
  size?: number;
}

export interface Globe3DConfig {
  radius?: number;
  globeColor?: string;
  textureUrl?: string;
  bumpMapUrl?: string;
  showAtmosphere?: boolean;
  atmosphereColor?: string;
  atmosphereIntensity?: number;
  atmosphereBlur?: number;
  bumpScale?: number;
  autoRotateSpeed?: number;
  enableZoom?: boolean;
  enablePan?: boolean;
  minDistance?: number;
  maxDistance?: number;
  initialRotation?: { x: number; y: number };
  markerSize?: number;
  showWireframe?: boolean;
  wireframeColor?: string;
  ambientIntensity?: number;
  pointLightIntensity?: number;
  backgroundColor?: string | null;
}

interface Globe3DProps {
  markers?: GlobeMarker[];
  config?: Globe3DConfig;
  className?: string;
  onMarkerClick?: (marker: GlobeMarker) => void;
  onMarkerHover?: (marker: GlobeMarker | null) => void;
  onLeadMarker?: (marker: GlobeMarker | null) => void;
}

const DEFAULT_EARTH_TEXTURE =
  "https://cdn.21st.dev/assets/localized/228deba2e4b600146bdcb6cfa359b8ead6aacc2b1c13550a29cd82824cfa1c01.jpg";
const DEFAULT_BUMP_TEXTURE =
  "https://cdn.21st.dev/assets/localized/839b12da2e4dd346b256cebae72e10c479a102c8980a22084c41275e4b9a0e12.png";

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

interface MarkerProps {
  marker: GlobeMarker;
  radius: number;
  defaultSize: number;
  facingScores: React.MutableRefObject<Map<string, number>>;
  onClick?: (marker: GlobeMarker) => void;
  onHover?: (marker: GlobeMarker | null) => void;
}

function Marker({ marker, radius, facingScores, onClick, onHover }: MarkerProps) {
  const [hovered, setHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const groupRef = useRef<THREE.Group>(null);
  const imageGroupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const surfacePosition = useMemo(
    () => latLngToVector3(marker.lat, marker.lng, radius * 1.001),
    [marker.lat, marker.lng, radius],
  );
  const topPosition = useMemo(
    () => latLngToVector3(marker.lat, marker.lng, radius * 1.045),
    [marker.lat, marker.lng, radius],
  );
  const lineHeight = topPosition.distanceTo(surfacePosition);

  const worldPos = useRef(new THREE.Vector3());
  const cameraDir = useRef(new THREE.Vector3());
  useFrame(() => {
    if (!imageGroupRef.current) return;
    imageGroupRef.current.getWorldPosition(worldPos.current);
    cameraDir.current.copy(camera.position).normalize();
    const dot = worldPos.current.normalize().dot(cameraDir.current);
    if (marker.label) facingScores.current.set(marker.label, dot);
    const facing = dot > 0.22;
    setIsVisible((current) => (current === facing ? current : facing));
  });

  const handlePointerEnter = useCallback(() => {
    setHovered(true);
    onHover?.(marker);
  }, [marker, onHover]);
  const handlePointerLeave = useCallback(() => {
    setHovered(false);
    onHover?.(null);
  }, [onHover]);
  const handleClick = useCallback(() => {
    onClick?.(marker);
  }, [marker, onClick]);

  const { lineCenter, lineQuaternion } = useMemo(() => {
    const center = surfacePosition.clone().lerp(topPosition, 0.5);
    const direction = topPosition.clone().sub(surfacePosition).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    return { lineCenter: center, lineQuaternion: quaternion };
  }, [surfacePosition, topPosition]);

  return (
    <group ref={groupRef} visible={isVisible}>
      <mesh position={lineCenter} quaternion={lineQuaternion}>
        <cylinderGeometry args={[0.0016, 0.0016, lineHeight, 6]} />
        <meshBasicMaterial
          color={hovered ? "#78c000" : "#2e4856"}
          transparent
          opacity={hovered ? 0.95 : 0.55}
        />
      </mesh>
      <mesh position={surfacePosition} quaternion={lineQuaternion}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshBasicMaterial color={hovered ? "#78c000" : "#2e4856"} />
      </mesh>
      <group ref={imageGroupRef} position={topPosition}>
        <Html
          center
          style={{
            pointerEvents: isVisible ? "auto" : "none",
            opacity: isVisible ? 1 : 0,
          }}
        >
          <button
            type="button"
            className={cn("globe-flag", hovered && "is-hot")}
            aria-label={marker.label || "Location"}
            onMouseEnter={handlePointerEnter}
            onMouseLeave={handlePointerLeave}
            onFocus={handlePointerEnter}
            onBlur={handlePointerLeave}
            onClick={handleClick}
          >
            <img src={marker.src} alt="" draggable={false} />
          </button>
        </Html>
      </group>
    </group>
  );
}

interface RotatingGlobeProps {
  config: Required<Globe3DConfig>;
  markers: GlobeMarker[];
  facingScores: React.MutableRefObject<Map<string, number>>;
  onMarkerClick?: (marker: GlobeMarker) => void;
  onMarkerHover?: (marker: GlobeMarker | null) => void;
}

function RotatingGlobe({ config, markers, facingScores, onMarkerClick, onMarkerHover }: RotatingGlobeProps) {
  const [earthTexture, bumpTexture] = useTexture([config.textureUrl, config.bumpMapUrl]);

  useMemo(() => {
    if (earthTexture) {
      earthTexture.colorSpace = THREE.SRGBColorSpace;
      earthTexture.anisotropy = 16;
    }
    if (bumpTexture) bumpTexture.anisotropy = 8;
  }, [earthTexture, bumpTexture]);

  const geometry = useMemo(
    () => new THREE.SphereGeometry(config.radius, 64, 64),
    [config.radius],
  );
  const wireframeGeometry = useMemo(
    () => new THREE.SphereGeometry(config.radius * 1.002, 32, 16),
    [config.radius],
  );

  return (
    <group>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          map={earthTexture}
          bumpMap={bumpTexture}
          bumpScale={config.bumpScale * 0.05}
          roughness={0.7}
          metalness={0}
        />
      </mesh>
      {config.showWireframe && (
        <mesh geometry={wireframeGeometry}>
          <meshBasicMaterial color={config.wireframeColor} wireframe transparent opacity={0.08} />
        </mesh>
      )}
      {markers.map((marker) => (
        <Marker
          key={`${marker.lat}-${marker.lng}-${marker.label ?? ""}`}
          marker={marker}
          radius={config.radius}
          defaultSize={config.markerSize}
          facingScores={facingScores}
          onClick={onMarkerClick}
          onHover={onMarkerHover}
        />
      ))}
    </group>
  );
}

function Atmosphere({
  radius,
  color,
  intensity,
  blur,
}: {
  radius: number;
  color: string;
  intensity: number;
  blur: number;
}) {
  const fresnelPower = Math.max(0.5, 5 - blur);
  const atmosphereMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        atmosphereColor: { value: new THREE.Color(color) },
        intensity: { value: intensity },
        fresnelPower: { value: fresnelPower },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 atmosphereColor;
        uniform float intensity;
        uniform float fresnelPower;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, normalize(-vPosition))), fresnelPower);
          gl_FragColor = vec4(atmosphereColor, fresnel * intensity);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
  }, [color, intensity, fresnelPower]);

  return (
    <mesh scale={[1.12, 1.12, 1.12]}>
      <sphereGeometry args={[radius, 64, 32]} />
      <primitive object={atmosphereMaterial} attach="material" />
    </mesh>
  );
}

function LeadWatch({
  markers,
  facingScores,
  onLeadRef,
}: {
  markers: GlobeMarker[];
  facingScores: React.MutableRefObject<Map<string, number>>;
  onLeadRef: React.MutableRefObject<((marker: GlobeMarker | null) => void) | undefined>;
}) {
  const last = useRef<string | null>(null);
  const pending = useRef<string | null>(null);
  const hold = useRef(0);

  useFrame((_, delta) => {
    let best: GlobeMarker | null = null;
    let bestDot = 0.22;
    for (const marker of markers) {
      const dot = marker.label ? facingScores.current.get(marker.label) ?? -1 : -1;
      if (dot > bestDot) {
        bestDot = dot;
        best = marker;
      }
    }
    const key = best?.label ?? null;
    if (key === last.current) {
      hold.current = 0;
      return;
    }
    if (last.current && key) {
      const currentDot = facingScores.current.get(last.current) ?? -1;
      if (currentDot > 0.22 && bestDot < currentDot + 0.08) return;
    }
    if (pending.current !== key) {
      pending.current = key;
      hold.current = 0;
    }
    hold.current += delta;
    if (hold.current < 0.35) return;
    last.current = key;
    onLeadRef?.current?.(best);
  });

  return null;
}

function Scene({
  markers,
  config,
  onMarkerClick,
  onMarkerHover,
  onLeadRef,
}: {
  markers: GlobeMarker[];
  config: Required<Globe3DConfig>;
  onMarkerClick?: (marker: GlobeMarker) => void;
  onMarkerHover?: (marker: GlobeMarker | null) => void;
  onLeadRef: React.MutableRefObject<((marker: GlobeMarker | null) => void) | undefined>;
}) {
  const facingScores = useRef(new Map<string, number>());
  const { camera } = useThree();
  React.useEffect(() => {
    camera.position.set(0, 0, config.radius * 2.85);
    camera.lookAt(0, 0, 0);
  }, [camera, config.radius]);

  return (
    <>
      <ambientLight intensity={config.ambientIntensity} />
      <directionalLight
        position={[config.radius * 5, config.radius * 2, config.radius * 5]}
        intensity={config.pointLightIntensity}
        color="#ffffff"
      />
      <directionalLight
        position={[-config.radius * 3, config.radius, -config.radius * 2]}
        intensity={config.pointLightIntensity * 0.3}
        color="#c6ee78"
      />
      <RotatingGlobe
        config={config}
        markers={markers}
        facingScores={facingScores}
        onMarkerClick={onMarkerClick}
        onMarkerHover={onMarkerHover}
      />
      {config.showAtmosphere && (
        <Atmosphere
          radius={config.radius}
          color={config.atmosphereColor}
          intensity={config.atmosphereIntensity}
          blur={config.atmosphereBlur}
        />
      )}
      <LeadWatch markers={markers} facingScores={facingScores} onLeadRef={onLeadRef} />
      <OrbitControls
        makeDefault
        enablePan={config.enablePan}
        enableZoom={config.enableZoom}
        minDistance={config.minDistance}
        maxDistance={config.maxDistance}
        rotateSpeed={0.4}
        autoRotate={config.autoRotateSpeed > 0}
        autoRotateSpeed={config.autoRotateSpeed}
        enableDamping
        dampingFactor={0.1}
      />
    </>
  );
}

function LoadingFallback() {
  return null;
}

const defaultConfig: Required<Globe3DConfig> = {
  radius: 2,
  globeColor: "#1a1a2e",
  textureUrl: DEFAULT_EARTH_TEXTURE,
  bumpMapUrl: DEFAULT_BUMP_TEXTURE,
  showAtmosphere: false,
  atmosphereColor: "#78c000",
  atmosphereIntensity: 0.5,
  atmosphereBlur: 2,
  bumpScale: 1,
  autoRotateSpeed: 0.3,
  enableZoom: false,
  enablePan: false,
  minDistance: 5,
  maxDistance: 15,
  initialRotation: { x: 0, y: 0 },
  markerSize: 36,
  showWireframe: false,
  wireframeColor: "#2e4856",
  ambientIntensity: 0.6,
  pointLightIntensity: 1.5,
  backgroundColor: null,
};

export function Globe3D({
  markers = [],
  config = {},
  className,
  onMarkerClick,
  onMarkerHover,
  onLeadMarker,
}: Globe3DProps) {
  const mergedConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  const onLeadRef = useRef(onLeadMarker);
  onLeadRef.current = onLeadMarker;

  return (
    <div className={cn("relative h-full min-h-[360px] w-full", className)}>
      <Canvas
        gl={(props) =>
          new THREE.WebGLRenderer({
            ...props,
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
          })
        }
        dpr={[1, 2]}
        camera={{
          fov: 45,
          near: 0.1,
          far: 1000,
          position: [0, 0, mergedConfig.radius * 3.55],
        }}
        style={{ background: mergedConfig.backgroundColor || "transparent", overflow: "visible" }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <Scene
            markers={markers}
            config={mergedConfig}
            onMarkerClick={onMarkerClick}
            onMarkerHover={onMarkerHover}
            onLeadRef={onLeadRef}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Globe3D;
