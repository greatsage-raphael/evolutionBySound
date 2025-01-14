'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Button } from "../ui/button"
import { Slider } from "../ui/slider"

export default function Cell() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [showControls, setShowControls] = useState(false)
  const materialRef = useRef<THREE.ShaderMaterial | null>(null)
  const [controls, setControls] = useState({
    paletteR: 0.5,
    paletteG: 0.5,
    paletteB: 0.5,
    intensity: 1.0,
    speed: 0.5,
    scale: 1.0
  })

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10)
    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    containerRef.current.appendChild(renderer.domElement)

    const geometry = new THREE.PlaneGeometry(2, 2)
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        mouseX: { value: 0.0 },
        mouseY: { value: 0.0 },
        touchActive: { value: 0.0 },
        paletteR: { value: controls.paletteR },
        paletteG: { value: controls.paletteG },
        paletteB: { value: controls.paletteB },
        intensity: { value: controls.intensity },
        speed: { value: controls.speed },
        scale: { value: controls.scale }
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
  uniform float scale;
  varying vec2 vUv;

  // Simplex 2D noise
  vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

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
    
    // Mouse/touch influence
    float mouseDistance = length(vec2(uv.x - mouseX, uv.y - mouseY));
    float mouseInfluence = touchActive * (1.0 - smoothstep(0.0, 0.5, mouseDistance));
    
    // Time-based evolution
    float t = time * speed;
    
    // Metamorphosis effect
    float n1 = snoise(uv * 2.0 * scale + t * 0.1);
    float n2 = snoise(uv * 4.0 * scale - t * 0.15);
    float n3 = snoise(uv * 8.0 * scale + t * 0.2);
    
    // Combine noise layers
    float noiseSum = n1 * 0.5 + n2 * 0.25 + n3 * 0.125;
    
    // Create organic shapes
    float shape = sin(noiseSum * 10.0 + t) * 0.5 + 0.5;
    shape = smoothstep(0.2, 0.8, shape);
    
    // Apply mouse/touch influence
    shape += mouseInfluence * sin(length(uv - vec2(mouseX, mouseY)) * 10.0 - t * 2.0) * 0.5;
    
    // Color the shape
    vec3 color = palette(shape + t * 0.1);
    
    // Add some depth with a subtle shadow
    float shadow = smoothstep(0.0, 0.5, shape) * 0.5;
    color *= 1.0 - shadow;
    
    // Intensity control
    color *= intensity;
    
    gl_FragColor = vec4(color, 1.0);
  }
`
    })

    materialRef.current = material

    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
    camera.position.z = 1

    // Touch and mouse handling
    let isTouch = false
    const updateMousePosition = (x: number, y: number) => {
      const rect = renderer.domElement.getBoundingClientRect()
      const mouseX = ((x - rect.left) / rect.width) * 2 - 1
      const mouseY = -((y - rect.top) / rect.height) * 2 + 1
      material.uniforms.mouseX.value = mouseX
      material.uniforms.mouseY.value = mouseY
      material.uniforms.touchActive.value = isTouch ? 1.0 : 0.0
    }

    const onMouseMove = (e: MouseEvent) => {
      isTouch = false
      updateMousePosition(e.clientX, e.clientY)
    }

    const onTouchMove = (e: TouchEvent) => {
      isTouch = true
      e.preventDefault()
      const touch = e.touches[0]
      updateMousePosition(touch.clientX, touch.clientY)
    }

    const onTouchEnd = () => {
      isTouch = false
      material.uniforms.touchActive.value = 0.0
    }

    renderer.domElement.addEventListener('mousemove', onMouseMove)
    renderer.domElement.addEventListener('touchmove', onTouchMove)
    renderer.domElement.addEventListener('touchend', onTouchEnd)

    // Handle window resize
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    // Animation loop
    let time = 0
    const animate = () => {
      requestAnimationFrame(animate)
      time += 0.01
      material.uniforms.time.value = time
      renderer.render(scene, camera)
    }
    animate()

    // Cleanup
    return () => {
      renderer.dispose()
      material.dispose()
      geometry.dispose()
      renderer.domElement.removeEventListener('mousemove', onMouseMove)
      renderer.domElement.removeEventListener('touchmove', onTouchMove)
      renderer.domElement.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('resize', onResize)
      containerRef.current?.removeChild(renderer.domElement)
    }
  }, [])

  // Update shader uniforms when controls change
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.paletteR.value = controls.paletteR
      materialRef.current.uniforms.paletteG.value = controls.paletteG
      materialRef.current.uniforms.paletteB.value = controls.paletteB
      materialRef.current.uniforms.intensity.value = controls.intensity
      materialRef.current.uniforms.speed.value = controls.speed
      materialRef.current.uniforms.scale.value = controls.scale
    }
  }, [controls])

  return (
    <div className="relative w-full h-screen">
      <div ref={containerRef} className="absolute inset-0" />
      
      <Button
        className="absolute top-4 right-4 z-10 bg-white"
        onClick={() => setShowControls(!showControls)}
      >
        {showControls ? 'Hide Controls' : 'Show Controls'}
      </Button>

      {showControls && (
        <div className="absolute right-4 top-16 w-64 bg-black/80 p-4 rounded-lg z-10 space-y-4">
          <div className="space-y-2">
            <label className="text-white text-sm">Red</label>
            <Slider
              value={[controls.paletteR]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([value]) => setControls(prev => ({ ...prev, paletteR: value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-white text-sm">Green</label>
            <Slider
              value={[controls.paletteG]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([value]) => setControls(prev => ({ ...prev, paletteG: value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-white text-sm">Blue</label>
            <Slider
              value={[controls.paletteB]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={([value]) => setControls(prev => ({ ...prev, paletteB: value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-white text-sm">Intensity</label>
            <Slider
              value={[controls.intensity]}
              min={0}
              max={2}
              step={0.01}
              onValueChange={([value]) => setControls(prev => ({ ...prev, intensity: value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-white text-sm">Speed</label>
            <Slider
              value={[controls.speed]}
              min={0}
              max={2}
              step={0.01}
              onValueChange={([value]) => setControls(prev => ({ ...prev, speed: value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-white text-sm">Scale</label>
            <Slider
              value={[controls.scale]}
              min={0.1}
              max={5}
              step={0.1}
              onValueChange={([value]) => setControls(prev => ({ ...prev, scale: value }))}
            />
          </div>
        </div>
      )}
    </div>
  )
}

