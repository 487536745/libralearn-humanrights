import {
  CameraControls,
  ContactShadows,
  Environment,
  Text,
} from "@react-three/drei";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./Avatar";

import { ClassroomScene } from "./ClassroomScene";

const Dots = (props) => {
  const { loading } = useChat();
  const [loadingText, setLoadingText] = useState("");
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingText((loadingText) => {
          if (loadingText.length > 2) {
            return ".";
          }
          return loadingText + ".";
        });
      }, 800);
      return () => clearInterval(interval);
    } else {
      setLoadingText("");
    }
  }, [loading]);
  if (!loading) return null;
  return (
    <group {...props}>
      <Text fontSize={0.14} anchorX={"left"} anchorY={"bottom"}>
        {loadingText}
        <meshBasicMaterial attach="material" color="black" />
      </Text>
    </group>
  );
};

export const Experience = ({
  avatarPosition = [0, 0, -2],
  avatarScale = 1,
  showClassroom = true,
  lookAtDefault = [0, 2, 5, 0, 1.5, 0],
  lookAtZoomed = [0, 1.5, 1.5, 0, 1.5, 0],
  lookAtUnzoomed = [0, 2.2, 5, 0, 1.0, 0],
}) => {
  const cameraControls = useRef();
  const { cameraZoomed, avatarRotationY } = useChat();
  const stableLookAtDefault = useMemo(() => lookAtDefault, [...lookAtDefault]);
  const stableLookAtZoomed = useMemo(() => lookAtZoomed, [...lookAtZoomed]);
  const stableLookAtUnzoomed = useMemo(() => lookAtUnzoomed, [...lookAtUnzoomed]);

  useEffect(() => {
    cameraControls.current.setLookAt(...stableLookAtDefault);
  }, [stableLookAtDefault]);

  useEffect(() => {
    if (cameraZoomed) {
      cameraControls.current.setLookAt(...stableLookAtZoomed, true);
    } else {
      cameraControls.current.setLookAt(...stableLookAtUnzoomed, true);
    }
  }, [cameraZoomed, stableLookAtZoomed, stableLookAtUnzoomed]);
  return (
    <>
      <CameraControls
        ref={cameraControls}
        mouseButtons={{ left: 0, middle: 0, right: 0, wheel: 0 }}
        touches={{ one: 0, two: 0, three: 0 }}
      />
      <Environment preset="sunset" />
      {/* Wrapping Dots into Suspense to prevent Blink when Troika/Font is loaded */}
      <Suspense fallback={null}>
  {/* 3D Classroom Environment */}
  {showClassroom && <ClassroomScene />}

  {/* Loading dots above avatar when speaking */}
  <Dots position-y={1.75} position-x={-0.02} />
</Suspense>

{/* Avatar positioned like teacher */}
<Avatar
  position={avatarPosition}
  scale={avatarScale}
  rotation={[0, avatarRotationY, 0]}
/>

{/* Shadow under avatar */}
<ContactShadows opacity={0.7} />

    </>
  );
};
