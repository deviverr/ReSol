import { Connection, PublicKey } from "@solana/web3.js";

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
const programId = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ??
    "BJbjgczJvjSb4GXPcjDWLPUQdfKRe7SFPCXQqZLcsrBw"
);
const usdcMint = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ??
    "B3rGdGRvZjkP1N2BJiRqyeQAm9sCeeP1vbkwzQcWSnSD"
);

const connection = new Connection(rpcUrl, "confirmed");
let failures = 0;

function check(label, cond) {
  console.log(`${cond ? "OK" : "FAIL"} ${label}`);
  if (!cond) failures++;
}

const [programInfo, mintInfo] = await Promise.all([
  connection.getAccountInfo(programId),
  connection.getAccountInfo(usdcMint),
]);

check(`program exists on ${rpcUrl}`, !!programInfo?.executable);
check("devnet USDC mint exists", !!mintInfo);

if (failures > 0) {
  console.error(`${failures} devnet verification check(s) failed.`);
  process.exit(1);
}

console.log("Devnet program configuration looks reachable.");
