import { useGLTF, useAnimations } from "@react-three/drei";
import { useRef, useEffect } from "react";
import * as THREE from "three";

function AvatarModel() {
  const { scene } = useGLTF("/models/64f1a714fe61576b46f27ca2.glb");
  const { animations } = useGLTF("/models/animations.glb");
  const groupRef = useRef();
  const { actions, mixer } = useAnimations(animations, groupRef);

  // Reset everything on mount to ensure proper positioning
  useEffect(() => {
    if (groupRef.current) {
      // Reset group position and rotation
      groupRef.current.position.set(0, -1.2, 0);
      groupRef.current.rotation.set(0, THREE.MathUtils.degToRad(20), 0);
      groupRef.current.scale.set(1.3, 1.3, 1.3);
    }

    // Reset scene transformations
    if (scene) {
      scene.position.set(0, 0, 0);
      scene.rotation.set(0, 0, 0);
      scene.scale.set(1, 1, 1);
    }
  }, [scene]);

  // Set up Idle animation
  useEffect(() => {
    const idleAnimation = animations.find((a) => a.name === "Idle") || animations.find((a) => a.name === "Standing Idle") || animations[0];
    if (idleAnimation && actions[idleAnimation.name]) {
      actions[idleAnimation.name]
        .reset()
        .fadeIn(0.5)
        .play();
    }
    return () => {
      if (idleAnimation && actions[idleAnimation.name]) {
        actions[idleAnimation.name].fadeOut(0.5);
      }
    };
  }, [actions, animations]);

  // Change hair color to black
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh && child.name === "Wolf3D_Hair") {
          if (child.material) {
            // Clone material to avoid affecting other instances
            child.material = child.material.clone();
            child.material.color.setHex(0x000000); // Black color
            child.material.needsUpdate = true;
          }
        }
      });
    }
  }, [scene]);

  return (
    <group ref={groupRef} dispose={null} position={[0, -1.2, 0]} rotation={[0, THREE.MathUtils.degToRad(20), 0]}>
      <primitive object={scene} scale={[1.3, 1.3, 1.3]} />
    </group>
  );
}

// Preload the models
useGLTF.preload("/models/64f1a714fe61576b46f27ca2.glb");
useGLTF.preload("/models/animations.glb");

export default AvatarModel;

