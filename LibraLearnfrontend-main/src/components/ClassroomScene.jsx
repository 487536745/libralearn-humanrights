import { Text, RoundedBox } from "@react-three/drei";

export const ClassroomScene = () => {
  const warmLightColor = "#ffd9a1"; // soft warm light
  const woodWallColor = "#8b6a4b"; // warm walnut for wood panels

  return (
    <group>
      {/* ===== Floor (wooden) ===== */}
      <group position={[0, -0.05, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[12, 0.1, 12]} />
          <meshStandardMaterial color="#c9a27a" roughness={0.85} metalness={0.02} />
        </mesh>
      </group>

      {/* ===== Walls and architectural elements ===== */}
      {/* Back Wall (full wood) */}
      <mesh position={[0, 2.5, -6]} castShadow receiveShadow>
        <boxGeometry args={[12, 5, 0.1]} />
        <meshStandardMaterial color={woodWallColor} roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Left Wall with window (full wood) */}
      <group position={[-6, 2.5, 0]}>
        {/* Wall panel */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[12, 5, 0.1]} />
          <meshStandardMaterial color={woodWallColor} roughness={0.9} metalness={0.05} />
        </mesh>
        {/* Window frame */}
        <group position={[0.05, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          {/* Outer frame */}
          <RoundedBox args={[2.8, 1.6, 0.08]} radius={0.06} smoothness={3} position={[0, 2.5, -3]}> 
            <meshStandardMaterial color="#d8dee6" metalness={0.1} roughness={0.4} />
          </RoundedBox>
          {/* Glass */}
          <mesh position={[0, 2.5, -3]}>
            <planeGeometry args={[2.6, 1.4]} />
            <meshPhysicalMaterial color="#cfe8ff" transmission={0.9} thickness={0.02} roughness={0.1} transparent opacity={0.8} />
          </mesh>
        </group>
      </group>

      {/* Right Wall with notice board (full wood) */}
      <group position={[6, 2.5, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[12, 5, 0.1]} />
          <meshStandardMaterial color={woodWallColor} roughness={0.9} metalness={0.05} />
        </mesh>
        {/* Notice board */}
        <group rotation={[0, Math.PI / 2, 0]} position={[0.06, 2.2, -2.2]}>
          <RoundedBox args={[2.2, 1.2, 0.08]} radius={0.05} smoothness={3}>
            <meshStandardMaterial color="#533a2a" roughness={0.6} />
          </RoundedBox>
          <mesh position={[0, 0, 0.05]}>
            <planeGeometry args={[2.0, 1.0]} />
            <meshStandardMaterial color="#caa47a" />
          </mesh>
          <Text position={[0, 0.45, 0.06]} fontSize={0.16} color="#221f1f" anchorX="center" anchorY="middle">Announcements</Text>
          <Text position={[0, 0.12, 0.06]} fontSize={0.12} color="#221f1f" anchorX="center" anchorY="middle">Quiz on Friday</Text>
          <Text position={[0, -0.18, 0.06]} fontSize={0.12} color="#221f1f" anchorX="center" anchorY="middle">Project groups formed</Text>
        </group>
      </group>

      {/* ===== Whiteboard (front) ===== */}
      <group position={[0, 2.1, -5.92]}>
        {/* Frame */}
        <RoundedBox args={[6.0, 2.6, 0.08]} radius={0.06} smoothness={3}>
          <meshStandardMaterial color="#d8dee6" roughness={0.5} />
        </RoundedBox>
        {/* Board surface */}
        <mesh position={[0, 0, 0.05]}>
          <planeGeometry args={[5.7, 2.3]} />
          <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.05} />
        </mesh>
        {/* Board writing title */}
        <Text position={[0, 0.2, 0.06]} fontSize={0.32} color="#1a1a1a" anchorX="center" anchorY="middle">Human Rights Education</Text>
      </group>

      {/* University text above board */}
      <Text position={[0, 3.6, -5.8]} fontSize={0.5} color="#8b0000" anchorX="center" anchorY="middle" outlineWidth={0.02} outlineColor="#ffffff">
        University of Central Punjab
      </Text>

      {/* ===== Teacher's desk and items ===== */}
      <group position={[0, 0, -3.2]}>
        <RoundedBox args={[2.2, 0.9, 1.1]} radius={0.06} smoothness={3} position={[0, 0.45, 0]}>
          <meshStandardMaterial color="#9b6643" roughness={0.85} />
        </RoundedBox>
        {/* Laptop base */}
        <mesh position={[0.55, 0.95, 0]} castShadow>
          <boxGeometry args={[0.6, 0.04, 0.42]} />
          <meshStandardMaterial color="#3a3a3a" roughness={0.6} />
        </mesh>
        {/* Laptop screen */}
        <mesh position={[0.55, 1.05, -0.16]} rotation={[Math.PI * -0.5, 0, 0]} castShadow>
          <planeGeometry args={[0.6, 0.42]} />
          <meshStandardMaterial color="#1e1e1e" />
        </mesh>
        {/* Book stack */}
        <mesh position={[-0.55, 0.92, 0]} castShadow>
          <boxGeometry args={[0.5, 0.06, 0.38]} />
          <meshStandardMaterial color="#2e8b57" />
        </mesh>
        <mesh position={[-0.55, 0.98, 0.02]} castShadow>
          <boxGeometry args={[0.48, 0.05, 0.36]} />
          <meshStandardMaterial color="#2a6f97" />
        </mesh>
        {/* Cup */}
        <mesh position={[0, 0.98, 0.25]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 0.22, 24]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
      </group>

      {/* ===== Student desks and chairs (4 sets, improved) ===== */}
      {[
        [-2.6, 0.0, 0.6], [2.6, 0.0, 0.6],
        [-2.6, 0.0, 2.4], [2.6, 0.0, 2.4]
      ].map(([x, y, z], idx) => (
        <group key={`set-${idx}`} position={[x, y, z]}>
          {/* Desk top */}
          <RoundedBox args={[1.5, 0.06, 0.7]} radius={0.04} smoothness={2} position={[0, 0.5, 0]}>
            <meshStandardMaterial color="#8b6a4b" roughness={0.85} />
          </RoundedBox>
          {/* Desk metal frame legs */}
          {[
            [-0.65, 0.25, -0.28], [0.65, 0.25, -0.28], [-0.65, 0.25, 0.28], [0.65, 0.25, 0.28]
          ].map((p, i) => (
            <mesh key={`dl-${i}`} position={p}>
              <boxGeometry args={[0.05, 0.5, 0.05]} />
              <meshStandardMaterial color="#a8b0b8" roughness={0.5} metalness={0.5} />
            </mesh>
          ))}
          {/* Crossbar */}
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[1.4, 0.04, 0.04]} />
            <meshStandardMaterial color="#a8b0b8" roughness={0.5} metalness={0.5} />
          </mesh>
          {/* Under-shelf */}
          <RoundedBox args={[1.2, 0.03, 0.45]} radius={0.02} smoothness={2} position={[0, 0.32, 0]}>
            <meshStandardMaterial color="#7a5d43" roughness={0.85} />
          </RoundedBox>

          {/* Chair (proper) */}
          <group position={[0, 0, 0.95]}>
            {/* Seat */}
            <RoundedBox args={[1.0, 0.06, 0.5]} radius={0.05} smoothness={2} position={[0, 0.32, 0]}>
              <meshStandardMaterial color="#6f5541" roughness={0.85} />
            </RoundedBox>
            {/* Backrest angled */}
            <group position={[0, 0.72, -0.18]} rotation={[Math.PI * -0.08, 0, 0]}>
              <RoundedBox args={[1.0, 0.55, 0.06]} radius={0.05} smoothness={2}>
                <meshStandardMaterial color="#6f5541" roughness={0.85} />
              </RoundedBox>
            </group>
            {/* Legs - front */}
            {[-0.45, 0.0, 0.18, 0.45, 0.0, 0.18].reduce((acc, val, i, arr) => {
              if (i % 3 === 0) acc.push([arr[i], arr[i+1], arr[i+2]]);
              return acc;
            }, []).map((p, i) => (
              <mesh key={`clf-${i}`} position={[p[0], 0.15, p[2]]}>
                <boxGeometry args={[0.05, 0.3, 0.05]} />
                <meshStandardMaterial color="#a8b0b8" roughness={0.5} metalness={0.5} />
              </mesh>
            ))}
            {/* Legs - rear */}
            {[-0.45, 0.0, -0.18, 0.45, 0.0, -0.18].reduce((acc, val, i, arr) => {
              if (i % 3 === 0) acc.push([arr[i], arr[i+1], arr[i+2]]);
              return acc;
            }, []).map((p, i) => (
              <mesh key={`clr-${i}`} position={[p[0], 0.15, p[2]]}>
                <boxGeometry args={[0.05, 0.3, 0.05]} />
                <meshStandardMaterial color="#a8b0b8" roughness={0.5} metalness={0.5} />
              </mesh>
            ))}
            {/* Side rails */}
            <mesh position={[0, 0.28, 0.0]}>
              <boxGeometry args={[1.0, 0.03, 0.03]} />
              <meshStandardMaterial color="#a8b0b8" roughness={0.5} metalness={0.5} />
            </mesh>
          </group>
        </group>
      ))}

      {/* ===== Wall posters ===== */}
      <group>
        {/* Equality poster */}
        <group position={[-4.8, 2.1, -5.7]}>
          <RoundedBox args={[1.8, 1.0, 0.06]} radius={0.04} smoothness={2}>
            <meshStandardMaterial color="#ffffff" />
          </RoundedBox>
          <mesh position={[0, 0, 0.04]}>
            <planeGeometry args={[1.6, 0.9]} />
            <meshStandardMaterial color="#e6f2ff" />
          </mesh>
          <Text position={[0, 0, 0.05]} fontSize={0.22} color="#1a1a1a" anchorX="center" anchorY="middle">Equality</Text>
          <Text position={[0, -0.3, 0.05]} fontSize={0.12} color="#1a1a1a" anchorX="center" anchorY="middle">Human Rights</Text>
        </group>

        {/* Human Rights poster */}
        <group position={[4.8, 2.1, -5.7]}>
          <RoundedBox args={[1.8, 1.0, 0.06]} radius={0.04} smoothness={2}>
            <meshStandardMaterial color="#ffffff" />
          </RoundedBox>
          <mesh position={[0, 0, 0.04]}>
            <planeGeometry args={[1.6, 0.9]} />
            <meshStandardMaterial color="#fff3e6" />
          </mesh>
          <Text position={[0, 0, 0.05]} fontSize={0.22} color="#1a1a1a" anchorX="center" anchorY="middle">Human Rights</Text>
          <Text position={[0, -0.3, 0.05]} fontSize={0.12} color="#1a1a1a" anchorX="center" anchorY="middle">Equality & Dignity</Text>
        </group>
      </group>

      {/* ===== Ceiling lights (soft warm) ===== */}
      {[-3, 0, 3].map((x, i) => (
        <group key={`light-${i}`} position={[x, 4.4, -1]}>
          {/* Fixture */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.6, 24]} />
            <meshStandardMaterial emissive={warmLightColor} emissiveIntensity={1.2} color="#ffffff" />
          </mesh>
          {/* Actual light */}
          <pointLight color={warmLightColor} intensity={1.0} distance={10} decay={2} position={[0, -0.1, 0]} />
        </group>
      ))}

      {/* Ambient and subtle sunlight */}
      <ambientLight intensity={0.35} color={warmLightColor} />
      <directionalLight position={[5, 8, 4]} intensity={0.5} color="#ffe6c4" castShadow />
    </group>
  );
};
