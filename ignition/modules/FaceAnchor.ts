import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FaceAnchorModule", (m) => {
  const anchor = m.contract("FaceAnchor");
  return { anchor };
});
