import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const GWEI_VALUE: bigint = 1_000_000_000_000_000n;

const SimpleERC20Module = buildModule("SimpleERC20", (m) => {

  const totalSupply = m.getParameter("total", GWEI_VALUE);

  const sm = m.contract("SimpleERC20", [totalSupply], {});
  
  return { sm };
});

export default SimpleERC20Module;
