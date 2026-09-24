import React from 'react';
import { Composition } from 'remotion';
import { GridDots } from './components/GridDots';
import { SphereRipple } from './components/SphereRipple';
import { DiamondKaleidoscope } from './components/DiamondKaleidoscope';
import { PlexusNetwork } from './components/PlexusNetwork';
import { VortexTunnel } from './components/VortexTunnel';
import { PastelFluidWaves } from './components/PastelFluidWaves';
import { HexagonalWave3D } from './components/HexagonalWave3D';
import { BreathingMesh } from './components/BreathingMesh';
import { HypnoSpiral } from './components/HypnoSpiral';
import TorusKnot from './components/TorusKnot';
import { PurpleCubes } from './components/PurpleCubes';
import { HexCubes } from './components/HexCubes';
import { RadialHex } from './components/RadialHex';
import RetroWaves from './components/RetroWaves';
import { TriMesh } from './components/TriMesh';
import { FiberOptic } from './components/FiberOptic';
import { WaveSpectrum } from './components/WaveSpectrum';
import { SilkWaves } from './components/SilkWaves';
import type { SilkWavesScheme } from './components/SilkWaves';
import { Inferno } from './components/Inferno';
import type { InfernoScheme } from './components/Inferno';
import { AuroraFlow } from './components/AuroraFlow';
import type { AuroraFlowScheme } from './components/AuroraFlow';
import { GlitterFlow } from './components/GlitterFlow';
import { LiquidChrome } from './components/LiquidChrome';
import type { LiquidChromeScheme } from './components/LiquidChrome';
import { LavaVeins } from './components/LavaVeins';
import type { LavaVeinsScheme } from './components/LavaVeins';
import { MarbleFlow } from './components/MarbleFlow';
import type { MarbleScheme } from './components/MarbleFlow';
import { UnderwaterCaustics } from './components/UnderwaterCaustics';
import type { CausticScheme } from './components/UnderwaterCaustics';
import { FrostCrystal } from './components/FrostCrystal';
import type { FrostScheme } from './components/FrostCrystal';
import { DiagonalFlow } from './components/DiagonalFlow';
import { BubbleDrift } from './components/BubbleDrift';
import type { BubbleScheme } from './components/BubbleDrift';
import { PoolRipples } from './components/PoolRipples';
import type { PoolScheme } from './components/PoolRipples';
import { BokehGlow } from './components/BokehGlow';
import type { BokehScheme } from './components/BokehGlow';
import { FlowLines } from './components/FlowLines';
import { NeonTubes } from './components/NeonTubes';
import type { NeonTubesScheme } from './components/NeonTubes';
import { HexStone } from './components/HexStone';
import type { HexStoneScheme } from './components/HexStone';
import { WireWave } from './components/WireWave';
import type { WireScheme } from './components/WireWave';
import { PlushFur } from './components/PlushFur';
import type { FurScheme } from './components/PlushFur';
import { PlasmaVortex } from './components/PlasmaVortex';
import type { PlasmaScheme } from './components/PlasmaVortex';
import { SilkGradient } from './components/SilkGradient';
import type { SilkScheme } from './components/SilkGradient';
import { SmokeWisps } from './components/SmokeWisps';
import type { SmokeScheme } from './components/SmokeWisps';
import { FlowingLines } from './components/FlowingLines';
import type { LinesScheme } from './components/FlowingLines';
import { BlueFire } from './components/BlueFire';
import type { FireScheme } from './components/BlueFire';
import { TitaniumRibs } from './components/TitaniumRibs';
import { BlueLens } from './components/BlueLens';
import { ConcentricLens } from './components/ConcentricLens';
import { FacetedMosaic } from './components/FacetedMosaic';
import { ColorFacet } from './components/ColorFacet';
import { GoldHexWave } from './components/GoldHexWave';
import { HexWave } from './components/HexWave';
import { LiquidGold } from './components/LiquidGold';
import { LiquidMetal } from './components/LiquidMetal';
import { RetroPoly } from './components/RetroPoly';
import { PastelDrift } from './components/PastelDrift';
import { InkBloom } from './components/InkBloom';
import { DiscoPixel } from './components/DiscoPixel';
import { DiscoTiles } from './components/DiscoTiles';
import { CubeField } from './components/CubeField';
import { CubeBlocks } from './components/CubeBlocks';
import { RainbowVortex } from './components/RainbowVortex';
import { VioletFan } from './components/VioletFan';
import { FanBlades } from './components/FanBlades';
import { NeonStrings } from './components/NeonStrings';
import type { StringScheme } from './components/NeonStrings';
import { NeonTerrain } from './components/NeonTerrain';
import { MoltenGold } from './components/MoltenGold';
import type { MoltenScheme } from './components/MoltenGold';
import { HoloMarble } from './components/HoloMarble';
import type { HoloScheme } from './components/HoloMarble';
import { LiquidChrome } from './components/LiquidChrome';
import type { ChromeScheme } from './components/LiquidChrome';
import { GlassBlocks } from './components/GlassBlocks';
import { HexSphere } from './components/HexSphere';
import type { HexScheme } from './components/HexSphere';
import { PastelCubes } from './components/PastelCubes';
import type { CubeScheme } from './components/PastelCubes';
import { PolyPlates } from './components/PolyPlates';
import type { PlateScheme } from './components/PolyPlates';
import { palettes } from './utils/colors';

const FPS = 30;
const DURATION = FPS * 15;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GridWave"
        component={() => (
          <GridDots palette={palettes.ocean} rows={20} cols={35} speed={1} width={3840} height={2160} dotSize={12} totalFrames={DURATION} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="GridWaveNeon"
        component={() => (
          <GridDots palette={palettes.neon} rows={20} cols={35} speed={1} width={3840} height={2160} dotSize={12} totalFrames={DURATION} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SphereRipple"
        component={() => (
          <SphereRipple width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="NeonPurpleSphere"
        component={() => (
          <SphereRipple width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="neonPurple" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SunsetGoldSphere"
        component={() => (
          <SphereRipple width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sunsetGold" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="DiamondKaleidoscope"
        component={() => (
          <DiamondKaleidoscope width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlexusNetwork"
        component={() => (
          <PlexusNetwork width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="VortexTunnel"
        component={() => (
          <VortexTunnel width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="cyan" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FireVortex"
        component={() => (
          <VortexTunnel width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="neonPink" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="AuroraVortex"
        component={() => (
          <VortexTunnel width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="toxicGreen" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PastelFluidWaves"
        component={() => (
          <PastelFluidWaves width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HexagonalWave3D"
        component={() => (
          <HexagonalWave3D width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="cyan" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MagmaHex"
        component={() => (
          <HexagonalWave3D width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="magma" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="AuroraHex"
        component={() => (
          <HexagonalWave3D width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="aurora" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BreathingMeshBlue"
        component={() => (
          <BreathingMesh width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="blueOcean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BreathingMeshSteel"
        component={() => (
          <BreathingMesh width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="steel" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BreathingMeshDeepSea"
        component={() => (
          <BreathingMesh width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="deepSea" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HypnoSpiralClassic"
        component={() => (
          <HypnoSpiral width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="classic" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HypnoSpiralNeon"
        component={() => (
          <HypnoSpiral width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="neon" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HypnoSpiralSunset"
        component={() => (
          <HypnoSpiral width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sunset" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="TorusKnot"
        component={() => (
          <TorusKnot width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PurpleCubes"
        component={() => (
          <PurpleCubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="purple" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="NeonCubes"
        component={() => (
          <PurpleCubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="neon" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MagmaCubes"
        component={() => (
          <PurpleCubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="magma" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="EmeraldHex"
        component={() => (
          <HexCubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="emerald" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="OceanHex"
        component={() => (
          <HexCubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="LavaHex"
        component={() => (
          <HexCubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="lava" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RadialHex"
        component={() => (
          <RadialHex width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="blue" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RadialHexRed"
        component={() => (
          <RadialHex width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="red" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RadialHexGreen"
        component={() => (
          <RadialHex width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="green" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RetroWaves"
        component={() => (
          <RetroWaves width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="classic" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RetroWavesCandy"
        component={() => (
          <RetroWaves width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="candy" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RetroWavesMiami"
        component={() => (
          <RetroWaves width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="miami" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="TriMeshOcean"
        component={() => (
          <TriMesh width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="TriMeshSunset"
        component={() => (
          <TriMesh width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sunset" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="TriMeshNeon"
        component={() => (
          <TriMesh width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="neon" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FiberOptic"
        component={() => (
          <FiberOptic width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="WaveSpectrum"
        component={() => (
          <WaveSpectrum width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SilkWavesRainbow"
        component={() => (
          <SilkWaves width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="rainbow" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SilkWavesAurora"
        component={() => (
          <SilkWaves width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="aurora" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SilkWavesFire"
        component={() => (
          <SilkWaves width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="fire" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SilkWavesOcean"
        component={() => (
          <SilkWaves width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="Inferno"
        component={() => (
          <Inferno width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="inferno" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="InfernoBlueFire"
        component={() => (
          <Inferno width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="bluefire" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="InfernoToxic"
        component={() => (
          <Inferno width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="toxic" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="InfernoVoid"
        component={() => (
          <Inferno width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="void" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="InfernoSolar"
        component={() => (
          <Inferno width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="solar" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="AuroraFlow"
        component={() => (
          <AuroraFlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="neon" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="AuroraFlowSunset"
        component={() => (
          <AuroraFlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sunset" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="AuroraFlowArctic"
        component={() => (
          <AuroraFlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="arctic" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="AuroraFlowForest"
        component={() => (
          <AuroraFlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="forest" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="AuroraFlowGolden"
        component={() => (
          <AuroraFlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="golden" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="GlitterFlow"
        component={() => (
          <GlitterFlow width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="LavaVeins"
        component={() => (
          <LavaVeins width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="lava" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="LavaVeinsIce"
        component={() => (
          <LavaVeins width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ice" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="LavaVeinsToxic"
        component={() => (
          <LavaVeins width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="toxic" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="LavaVeinsVoid"
        component={() => (
          <LavaVeins width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="void" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="LavaVeinsSolar"
        component={() => (
          <LavaVeins width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="solar" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MarbleFlow"
        component={() => (
          <MarbleFlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="classic" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MarbleFlowNoir"
        component={() => (
          <MarbleFlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="noir" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MarbleFlowRosa"
        component={() => (
          <MarbleFlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="rosa" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MarbleFlowVerde"
        component={() => (
          <MarbleFlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="verde" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MarbleFlowRoyal"
        component={() => (
          <MarbleFlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="royal" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="UnderwaterCaustics"
        component={() => (
          <UnderwaterCaustics width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="tropical" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="UnderwaterCausticsDeepOcean"
        component={() => (
          <UnderwaterCaustics width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="deepOcean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="UnderwaterCausticsCoral"
        component={() => (
          <UnderwaterCaustics width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="coral" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="UnderwaterCausticsKelp"
        component={() => (
          <UnderwaterCaustics width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="kelp" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="UnderwaterCausticsAbyss"
        component={() => (
          <UnderwaterCaustics width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="abyss" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FrostCrystal"
        component={() => (
          <FrostCrystal width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="arctic" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FrostCrystalAurora"
        component={() => (
          <FrostCrystal width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="aurora" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FrostCrystalEmber"
        component={() => (
          <FrostCrystal width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ember" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FrostCrystalVoid"
        component={() => (
          <FrostCrystal width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="void" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FrostCrystalEmerald"
        component={() => (
          <FrostCrystal width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="emerald" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="DiagonalFlow"
        component={() => (
          <DiagonalFlow width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BubbleDrift"
        component={() => (
          <BubbleDrift width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="silver" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BubbleDriftGold"
        component={() => (
          <BubbleDrift width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="gold" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BubbleDriftOcean"
        component={() => (
          <BubbleDrift width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BubbleDriftRose"
        component={() => (
          <BubbleDrift width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="rose" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BubbleDriftEmerald"
        component={() => (
          <BubbleDrift width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="emerald" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PoolRipples"
        component={() => (
          <PoolRipples width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="tropical" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PoolRipplesLagoon"
        component={() => (
          <PoolRipples width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="lagoon" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PoolRipplesSunset"
        component={() => (
          <PoolRipples width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sunset" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PoolRipplesMidnight"
        component={() => (
          <PoolRipples width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="midnight" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PoolRipplesEmerald"
        component={() => (
          <PoolRipples width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="emerald" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BokehGlow"
        component={() => (
          <BokehGlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="aqua" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BokehGlowViolet"
        component={() => (
          <BokehGlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="violet" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BokehGlowRose"
        component={() => (
          <BokehGlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="rose" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BokehGlowGold"
        component={() => (
          <BokehGlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="gold" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BokehGlowEmerald"
        component={() => (
          <BokehGlow width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="emerald" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FlowLines"
        component={() => (
          <FlowLines width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="NeonTubes"
        component={() => (
          <NeonTubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="neon" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PurpleTubes"
        component={() => (
          <NeonTubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="purple" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MagmaTubes"
        component={() => (
          <NeonTubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="magma" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HexStone"
        component={() => (
          <HexStone width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="carbon" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HexStoneGraphite"
        component={() => (
          <HexStone width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="graphite" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HexStoneSand"
        component={() => (
          <HexStone width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sandstone" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HexStoneSlate"
        component={() => (
          <HexStone width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="slate" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HexStoneBronze"
        component={() => (
          <HexStone width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="bronze" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HexStoneMidnight"
        component={() => (
          <HexStone width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="midnight" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="WireWave"
        component={() => (
          <WireWave width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="mono" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="WireWaveEmber"
        component={() => (
          <WireWave width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ember" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="WireWaveAbyss"
        component={() => (
          <WireWave width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="abyss" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="WireWaveMint"
        component={() => (
          <WireWave width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="mint" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="WireWaveRoyal"
        component={() => (
          <WireWave width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="royal" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlushFur"
        component={() => (
          <PlushFur width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="pink" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlushFurCream"
        component={() => (
          <PlushFur width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="cream" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlushFurLavender"
        component={() => (
          <PlushFur width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="lavender" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlushFurMint"
        component={() => (
          <PlushFur width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="mint" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlushFurSky"
        component={() => (
          <PlushFur width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sky" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlasmaVortex"
        component={() => (
          <PlasmaVortex width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="violet" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlasmaVortexCrimson"
        component={() => (
          <PlasmaVortex width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="crimson" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlasmaVortexAbyss"
        component={() => (
          <PlasmaVortex width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="abyss" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlasmaVortexInferno"
        component={() => (
          <PlasmaVortex width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="inferno" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlasmaVortexVenom"
        component={() => (
          <PlasmaVortex width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="venom" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SilkGradient"
        component={() => (
          <SilkGradient width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="dusk" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SilkGradientSunset"
        component={() => (
          <SilkGradient width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sunset" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SilkGradientLagoon"
        component={() => (
          <SilkGradient width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="lagoon" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SilkGradientRose"
        component={() => (
          <SilkGradient width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="rose" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SilkGradientMidnight"
        component={() => (
          <SilkGradient width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="midnight" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SmokeWisps"
        component={() => (
          <SmokeWisps width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="mono" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SmokeWispsEmber"
        component={() => (
          <SmokeWisps width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ember" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SmokeWispsAbyss"
        component={() => (
          <SmokeWisps width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="abyss" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SmokeWispsMint"
        component={() => (
          <SmokeWisps width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="mint" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SmokeWispsRoyal"
        component={() => (
          <SmokeWisps width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="royal" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FlowingLines"
        component={() => (
          <FlowingLines width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="mono" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FlowingLinesCyan"
        component={() => (
          <FlowingLines width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="cyan" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FlowingLinesGold"
        component={() => (
          <FlowingLines width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="gold" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FlowingLinesNeon"
        component={() => (
          <FlowingLines width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="neon" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FlowingLinesMint"
        component={() => (
          <FlowingLines width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="mint" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BlueFire"
        component={() => (
          <BlueFire width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="blue" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BlueFireCrimson"
        component={() => (
          <BlueFire width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="crimson" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BlueFireToxic"
        component={() => (
          <BlueFire width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="toxic" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BlueFireViolet"
        component={() => (
          <BlueFire width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="violet" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BlueFireSolar"
        component={() => (
          <BlueFire width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="solar" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="TitaniumRibs"
        component={() => (
          <TitaniumRibs width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="BlueLens"
        component={() => (
          <BlueLens width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="EmeraldLens"
        component={() => (
          <ConcentricLens width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="emerald" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="VioletLens"
        component={() => (
          <ConcentricLens width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="violet" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="SolarLens"
        component={() => (
          <ConcentricLens width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="solar" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RoseLens"
        component={() => (
          <ConcentricLens width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="rose" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FacetedMosaic"
        component={() => (
          <FacetedMosaic width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="GoldFacet"
        component={() => (
          <ColorFacet width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="gold" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RoseFacet"
        component={() => (
          <ColorFacet width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="rose" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="EmeraldFacet"
        component={() => (
          <ColorFacet width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="emerald" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="VioletFacet"
        component={() => (
          <ColorFacet width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="violet" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="GoldHexWave"
        component={() => (
          <GoldHexWave width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="CrimsonHexWave"
        component={() => (
          <HexWave width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="crimson" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="EmeraldHexWave"
        component={() => (
          <HexWave width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="emerald" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="VioletHexWave"
        component={() => (
          <HexWave width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="violet" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="OceanHexWave"
        component={() => (
          <HexWave width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RetroSunset"
        component={() => (
          <RetroPoly width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sunset" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RetroCandy"
        component={() => (
          <RetroPoly width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="candy" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RetroWave"
        component={() => (
          <RetroPoly width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="wave" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RetroPop"
        component={() => (
          <RetroPoly width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="pop" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RetroMint"
        component={() => (
          <RetroPoly width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="mint" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RetroDusk"
        component={() => (
          <RetroPoly width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="dusk" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PastelPeach"
        component={() => (
          <PastelDrift width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="peach" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PastelLavender"
        component={() => (
          <PastelDrift width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="lavender" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PastelMint"
        component={() => (
          <PastelDrift width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="mint" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PastelSky"
        component={() => (
          <PastelDrift width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sky" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PastelRose"
        component={() => (
          <PastelDrift width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="rose" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="InkBloom"
        component={() => (
          <InkBloom width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="DiscoPixel"
        component={() => (
          <DiscoPixel width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="DiscoOcean"
        component={() => (
          <DiscoTiles width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="DiscoCrimson"
        component={() => (
          <DiscoTiles width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="crimson" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="DiscoEmerald"
        component={() => (
          <DiscoTiles width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="emerald" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="DiscoSunset"
        component={() => (
          <DiscoTiles width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sunset" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="CubeField"
        component={() => (
          <CubeField width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="CubeOcean"
        component={() => (
          <CubeBlocks width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="CubeCandy"
        component={() => (
          <CubeBlocks width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="candy" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="CubeMint"
        component={() => (
          <CubeBlocks width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="mint" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="CubeSunset"
        component={() => (
          <CubeBlocks width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sunset" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="RainbowVortex"
        component={() => (
          <RainbowVortex width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="VioletFan"
        component={() => (
          <VioletFan width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FanCrimson"
        component={() => (
          <FanBlades width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="crimson" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FanOcean"
        component={() => (
          <FanBlades width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FanEmerald"
        component={() => (
          <FanBlades width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="emerald" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="FanAmber"
        component={() => (
          <FanBlades width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="amber" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="NeonStrings"
        component={() => (
          <NeonStrings width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="NeonStringsCrimson"
        component={() => (
          <NeonStrings width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="crimson" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="NeonStringsOcean"
        component={() => (
          <NeonStrings width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="NeonStringsEmerald"
        component={() => (
          <NeonStrings width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="emerald" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="NeonStringsSunset"
        component={() => (
          <NeonStrings width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sunset" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="NeonTerrain"
        component={() => (
          <NeonTerrain width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MoltenGold"
        component={() => (
          <MoltenGold width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MoltenSilver"
        component={() => (
          <MoltenGold width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="silver" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MoltenCopper"
        component={() => (
          <MoltenGold width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="copper" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MoltenOcean"
        component={() => (
          <MoltenGold width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="MoltenCrimson"
        component={() => (
          <MoltenGold width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="crimson" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HoloMarble"
        component={() => (
          <HoloMarble width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HoloAurora"
        component={() => (
          <HoloMarble width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="aurora" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HoloSunset"
        component={() => (
          <HoloMarble width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sunset" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HoloOcean"
        component={() => (
          <HoloMarble width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HoloForest"
        component={() => (
          <HoloMarble width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="forest" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="LiquidChrome"
        component={() => (
          <LiquidChrome width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="LiquidGold"
        component={() => (
          <LiquidChrome width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="gold" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="LiquidRose"
        component={() => (
          <LiquidChrome width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="rose" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="LiquidOcean"
        component={() => (
          <LiquidChrome width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="LiquidEmerald"
        component={() => (
          <LiquidChrome width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="emerald" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="GlassBlocks"
        component={() => (
          <GlassBlocks width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HexSphere"
        component={() => (
          <HexSphere width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HexTeal"
        component={() => (
          <HexSphere width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="teal" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HexViolet"
        component={() => (
          <HexSphere width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="violet" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HexAmber"
        component={() => (
          <HexSphere width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="amber" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="HexRose"
        component={() => (
          <HexSphere width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="rose" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PastelCubes"
        component={() => (
          <PastelCubes width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PastelSunset"
        component={() => (
          <PastelCubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sunset" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PastelOcean"
        component={() => (
          <PastelCubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="ocean" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PastelCandy"
        component={() => (
          <PastelCubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="candy" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PastelForest"
        component={() => (
          <PastelCubes width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="forest" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PolyPlates"
        component={() => (
          <PolyPlates width={3840} height={2160} totalFrames={DURATION} speed={1} />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlateWarm"
        component={() => (
          <PolyPlates width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="warm" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlateCool"
        component={() => (
          <PolyPlates width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="cool" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlateRose"
        component={() => (
          <PolyPlates width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="rose" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
      <Composition
        id="PlateSage"
        component={() => (
          <PolyPlates width={3840} height={2160} totalFrames={DURATION} speed={1} scheme="sage" />
        )}
        durationInFrames={DURATION + 1}
        fps={FPS}
        width={3840}
        height={2160}
      />
    </>
  );
};
