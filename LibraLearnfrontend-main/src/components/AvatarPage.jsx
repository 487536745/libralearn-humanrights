import { Loader } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Leva } from "leva";
import { Experience } from "./Experience";
import { UI } from "./UI";
import SideNavbar from "./SideNavbar";

const AvatarPage = () => {
  return (
    <>
      <Loader />
      <Leva hidden />
      <SideNavbar />
      <UI />
      <Canvas shadows camera={{ position: [0, 0, 1], fov: 30 }}>
        <Experience />
      </Canvas>
    </>
  );
};

export default AvatarPage;

