"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Button } from "../components/ui/button";
import { Slider } from "../components/ui/slider";
import Cell from "../components/pages/cell";
import AudioPlayer from "../components/ui/audioPlayer";
import { useUser } from "@clerk/nextjs";


export default function InteractiveWave() {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animationFrameRef = useRef<number>(null);
  const [showControls, setShowControls] = useState(false);
  const [isAudioUploaded, setIsAudioUploaded] = useState(false);
  const [paletteControls, setPaletteControls] = useState({
    r: 0.263,
    g: 0.416,
    b: 0.557,
    intensity: 1.0,
    speed: 1.0,
  });
  const { user } = useUser();

  const [uploadedAudio, setUploadedAudio] = useState<string | null>(null);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const userId = user?.id;

    if (!userId) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", userId);

    try {
      const response = await fetch("https://red-delight-414207.uc.r.appspot.com/uploadAudio", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const { downloadURL } = await response.json();
        setUploadedAudio(downloadURL);
        setIsAudioUploaded(true);
      } else {
        console.error("Failed to upload music");
      }
    } catch (error) {
      console.error("Error uploading music:", error);
    }
  };

  useEffect(() => {
    if (!containerRef.current || !uploadedAudio) return;

    let audio: HTMLAudioElement;
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let scene: THREE.Scene;
    let camera: THREE.OrthographicCamera;
    let renderer: THREE.WebGLRenderer;
    let material: THREE.ShaderMaterial;
    let geometry: THREE.PlaneGeometry;

    const initializeAudioAndVisuals = async () => {
      // Create audio elements
      audio = new Audio();
      audio.src = uploadedAudio;
      audioRef.current = audio;

      // Initialize Three.js scene
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      containerRef.current?.appendChild(renderer.domElement);

      geometry = new THREE.PlaneGeometry(2, 2);
      material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          audioIntensity: { value: 0 },
          paletteR: { value: paletteControls.r },
          paletteG: { value: paletteControls.g },
          paletteB: { value: paletteControls.b },
          intensity: { value: paletteControls.intensity },
          speed: { value: paletteControls.speed },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float time;
          uniform float mouseX;
          uniform float mouseY;
          uniform float touchActive;
          uniform float paletteR;
          uniform float paletteG;
          uniform float paletteB;
          uniform float intensity;
          uniform float speed;
          varying vec2 vUv;

          vec3 palette(float t) {
            vec3 a = vec3(0.5, 0.5, 0.5);
            vec3 b = vec3(0.5, 0.5, 0.5);
            vec3 c = vec3(1.0, 1.0, 1.0);
            vec3 d = vec3(paletteR, paletteG, paletteB);
            return a + b * cos(6.28318 * (c * t + d));
          }

          void main() {
            vec2 uv = vUv * 2.0 - 1.0;
            vec2 uv0 = uv;
            
            float mouseDistance = length(vec2(uv.x - mouseX, uv.y - mouseY));
            float mouseInfluence = touchActive * (1.0 - smoothstep(0.0, 0.5, mouseDistance));
            
            float d = length(uv0);
            vec3 finalColor = vec3(0.0);
            
            for(float i = 0.0; i < 4.0; i++) {
              uv = fract(uv * (1.5 + mouseInfluence)) - 0.5;
              
              d = length(uv) * exp(-length(uv0));
              
              vec3 col = palette(length(uv0) + i*.4 + time * speed);
              
              d = sin(d * (8. + mouseInfluence * 4.) + time * speed) / 8.;
              d = abs(d);
              
              d = pow(0.01 / d, 1.2);
              
              finalColor += col * d * intensity;
            }
            
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `,
      });

      materialRef.current = material;

      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      camera.position.z = 1;

      // Wait for audio to be loaded
      await new Promise((resolve) => {
        audio.addEventListener('loadeddata', resolve, { once: true });
      });

      // Initialize audio context and analyzer
      audioContext = new window.AudioContext();
      analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(audio);
      
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Start both audio and animation
      audio.play();

      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);

        if (analyser) {
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          const normalizedAverage = average / 256.0;
          material.uniforms.audioIntensity.value = normalizedAverage;
        }

        material.uniforms.time.value += 0.01;
        renderer.render(scene, camera);
      };

      animate();
    };

    initializeAudioAndVisuals().catch(console.error);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (geometry) geometry.dispose();
      if (material) material.dispose();
      if (renderer) {
        renderer.dispose();
        containerRef.current?.removeChild(renderer.domElement);
      }
    };
  }, [uploadedAudio]);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.paletteR.value = paletteControls.r;
      materialRef.current.uniforms.paletteG.value = paletteControls.g;
      materialRef.current.uniforms.paletteB.value = paletteControls.b;
      materialRef.current.uniforms.intensity.value = paletteControls.intensity;
      materialRef.current.uniforms.speed.value = paletteControls.speed;
    }
  }, [paletteControls]);

  return (
    <div className="relative w-full h-screen">
      {!isAudioUploaded && <Cell />}
      <div ref={containerRef} className="absolute inset-0" />

      <input
        type="file"
        accept="audio/*"
        onChange={handleFileUpload}
        className="absolute top-4 left-4 z-10"
      />

      {isAudioUploaded && (
        <>
          <Button
            className="absolute top-4 right-4 z-10 bg-white"
            onClick={() => setShowControls(!showControls)}
          >
            {showControls ? "Hide Controls" : "Show Controls"}
          </Button>

          <AudioPlayer
            audioUrl={uploadedAudio}
            onPlay={() => {
              if (audioRef.current) {
                audioRef.current.play();
              }
            }}
            onPause={() => {
              if (audioRef.current) {
                audioRef.current.pause();
              }
            }}
          />
        </>
      )}
      {showControls && (
        <div className="absolute right-4 top-16 w-64 bg-black/80 p-4 rounded-lg z-10 space-y-4">
          <div className="space-y-2">
            <label className="text-white text-sm">Red</label>
            <Slider
              value={[paletteControls.r]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([value]) =>
                setPaletteControls((prev) => ({ ...prev, r: value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-white text-sm">Green</label>
            <Slider
              value={[paletteControls.g]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([value]) =>
                setPaletteControls((prev) => ({ ...prev, g: value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-white text-sm">Blue</label>
            <Slider
              value={[paletteControls.b]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([value]) =>
                setPaletteControls((prev) => ({ ...prev, b: value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-white text-sm">Intensity</label>
            <Slider
              value={[paletteControls.intensity]}
              min={0}
              max={2}
              step={0.01}
              onValueChange={([value]) =>
                setPaletteControls((prev) => ({ ...prev, intensity: value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-white text-sm">Speed</label>
            <Slider
              value={[paletteControls.speed]}
              min={0}
              max={2}
              step={0.01}
              onValueChange={([value]) =>
                setPaletteControls((prev) => ({ ...prev, speed: value }))
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}