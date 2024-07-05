import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ONE_GWEI: bigint = 1_000_000_000n;

const SecretsManagerModule = buildModule("SecretsManager", (m) => {

  const feeAmount = m.getParameter("fee", ONE_GWEI);

  const sm = m.contract("SecretsManager", [feeAmount], {
    // value: feeAmount,
  });

  return { sm };
});

export default SecretsManagerModule;
