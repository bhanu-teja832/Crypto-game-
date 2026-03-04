import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { assert } from "chai";
import crypto from "crypto";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Derive the game pool PDA */
function gamePoolPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("game_pool")], programId);
}

/** Derive a game round PDA */
function gameRoundPDA(
  programId: PublicKey,
  roundId: BN
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("game_round"), roundId.toArrayLike(Buffer, "le", 8)],
    programId
  );
}

/** Derive a player bet PDA */
function playerBetPDA(
  programId: PublicKey,
  player: PublicKey,
  roundId: BN
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("player_bet"),
      player.toBuffer(),
      roundId.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
}

/** Generate a fake 32-byte round hash */
function fakeRoundHash(): Uint8Array {
  return crypto.randomBytes(32);
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe("crash-roulette", () => {
  // Configure the provider to use localnet (or devnet via env)
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load the compiled program
  const program = anchor.workspace.CrashRoulette as Program;
  const programId = program.programId;

  // House authority (the test wallet pays for everything)
  const authority = provider.wallet as anchor.Wallet;

  // A second keypair to simulate a player
  const player = Keypair.generate();

  // Derived accounts (filled in during tests)
  let [poolPDA] = gamePoolPDA(programId);
  let roundPDA: PublicKey;
  let betPDA: PublicKey;

  // ── Fund player ────────────────────────────────────────────────────────────
  before(async () => {
    const sig = await provider.connection.requestAirdrop(
      player.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Initialize
  // ──────────────────────────────────────────────────────────────────────────
  it("initializes the game pool", async () => {
    const [pool, bump] = gamePoolPDA(programId);
    poolPDA = pool;

    const houseEdgeBps = 300; // 3%
    await program.methods
      .initialize(houseEdgeBps)
      .accounts({
        authority: authority.publicKey,
        gamePool: poolPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const poolData = await program.account.gamePool.fetch(poolPDA);

    assert.equal(
      poolData.authority.toBase58(),
      authority.publicKey.toBase58(),
      "authority mismatch"
    );
    assert.equal(poolData.houseEdgeBps, 300, "house edge mismatch");
    assert.equal(poolData.currentRound.toNumber(), 0, "round should be 0");
    assert.equal(poolData.roundActive, false, "round should not be active");

    console.log("  ✓ Pool PDA:", poolPDA.toBase58());
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Start Round
  // ──────────────────────────────────────────────────────────────────────────
  it("starts round 1", async () => {
    const poolData = await program.account.gamePool.fetch(poolPDA);
    const nextRoundId = poolData.currentRound.add(new BN(1));
    const [round] = gameRoundPDA(programId, nextRoundId);
    roundPDA = round;

    await program.methods
      .startRound()
      .accounts({
        authority: authority.publicKey,
        gamePool: poolPDA,
        gameRound: roundPDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const roundData = await program.account.gameRound.fetch(roundPDA);
    const updatedPool = await program.account.gamePool.fetch(poolPDA);

    assert.equal(roundData.roundId.toNumber(), 1, "round ID should be 1");
    assert.equal(updatedPool.currentRound.toNumber(), 1, "pool round should be 1");
    assert.equal(updatedPool.roundActive, true, "round should be active");
    assert.equal(roundData.settled, false, "round should not be settled");

    console.log("  ✓ Round PDA:", roundPDA.toBase58());
  });

  it("rejects starting a second round while one is active", async () => {
    const poolData = await program.account.gamePool.fetch(poolPDA);
    const nextRoundId = poolData.currentRound.add(new BN(1));
    const [nextRound] = gameRoundPDA(programId, nextRoundId);

    try {
      await program.methods
        .startRound()
        .accounts({
          authority: authority.publicKey,
          gamePool: poolPDA,
          gameRound: nextRound,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown RoundAlreadyActive");
    } catch (err: any) {
      assert.include(err.message, "RoundAlreadyActive");
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Place Bet
  // ──────────────────────────────────────────────────────────────────────────
  it("player places a bet of 0.1 SOL (manual cash-out)", async () => {
    const poolData = await program.account.gamePool.fetch(poolPDA);
    const [bet] = playerBetPDA(programId, player.publicKey, poolData.currentRound);
    betPDA = bet;

    const betAmount = new BN(0.1 * LAMPORTS_PER_SOL);

    await program.methods
      .placeBet(betAmount, new BN(0)) // 0 = manual cash-out
      .accounts({
        player: player.publicKey,
        gamePool: poolPDA,
        gameRound: roundPDA,
        playerBet: betPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([player])
      .rpc();

    const betData = await program.account.playerBet.fetch(betPDA);
    const roundData = await program.account.gameRound.fetch(roundPDA);

    assert.equal(
      betData.player.toBase58(),
      player.publicKey.toBase58(),
      "player mismatch"
    );
    assert.equal(
      betData.amount.toNumber(),
      0.1 * LAMPORTS_PER_SOL,
      "amount mismatch"
    );
    assert.equal(betData.settled, false, "bet should not be settled");
    assert.equal(roundData.playerCount, 1, "player count should be 1");

    console.log("  ✓ Bet PDA:", betPDA.toBase58());
  });

  it("rejects a bet below minimum (0.001 SOL)", async () => {
    const player2 = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      player2.publicKey,
      LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig, "confirmed");

    const poolData = await program.account.gamePool.fetch(poolPDA);
    const [bet] = playerBetPDA(programId, player2.publicKey, poolData.currentRound);

    try {
      await program.methods
        .placeBet(new BN(1_000_000), new BN(0)) // 0.001 SOL — below minimum
        .accounts({
          player: player2.publicKey,
          gamePool: poolPDA,
          gameRound: roundPDA,
          playerBet: bet,
          systemProgram: SystemProgram.programId,
        })
        .signers([player2])
        .rpc();
      assert.fail("Should have thrown BetTooSmall");
    } catch (err: any) {
      assert.include(err.message, "BetTooSmall");
    }
  });

  it("rejects a duplicate bet from the same player in the same round", async () => {
    const poolData = await program.account.gamePool.fetch(poolPDA);
    const [bet] = playerBetPDA(programId, player.publicKey, poolData.currentRound);

    try {
      await program.methods
        .placeBet(new BN(0.1 * LAMPORTS_PER_SOL), new BN(0))
        .accounts({
          player: player.publicKey,
          gamePool: poolPDA,
          gameRound: roundPDA,
          playerBet: bet,
          systemProgram: SystemProgram.programId,
        })
        .signers([player])
        .rpc();
      assert.fail("Should have thrown (account already exists)");
    } catch (err: any) {
      // Anchor throws when trying to init an already-existing account
      assert.ok(err, "Expected an error for duplicate bet");
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Cash Out
  // ──────────────────────────────────────────────────────────────────────────
  it("player cashes out at 2.00x (co-signed by house)", async () => {
    const playerBalanceBefore = await provider.connection.getBalance(
      player.publicKey
    );

    const multiplierBps = new BN(200); // 2.00x
    const betAmount = 0.1 * LAMPORTS_PER_SOL;
    const expectedPayout = (betAmount * 200) / 100; // 0.2 SOL

    await program.methods
      .cashOut(multiplierBps)
      .accounts({
        player: player.publicKey,
        authority: authority.publicKey,
        gamePool: poolPDA,
        gameRound: roundPDA,
        playerBet: betPDA,
        playerPayout: player.publicKey,
      })
      .signers([player]) // authority signs via provider wallet
      .rpc();

    const betData = await program.account.playerBet.fetch(betPDA);
    const playerBalanceAfter = await provider.connection.getBalance(
      player.publicKey
    );

    assert.equal(betData.settled, true, "bet should be settled");
    assert.equal(betData.cashedOutAtBps.toNumber(), 200, "cash-out multiplier mismatch");
    assert.equal(betData.payout.toNumber(), expectedPayout, "payout mismatch");

    const gained = playerBalanceAfter - playerBalanceBefore;
    // Player gained ~0.2 SOL minus tx fees
    assert.isAbove(gained, 0, "player should have gained SOL");

    console.log(
      `  ✓ Cash-out: player gained ${gained / LAMPORTS_PER_SOL} SOL`
    );
  });

  it("rejects double cash-out on already settled bet", async () => {
    try {
      await program.methods
        .cashOut(new BN(300))
        .accounts({
          player: player.publicKey,
          authority: authority.publicKey,
          gamePool: poolPDA,
          gameRound: roundPDA,
          playerBet: betPDA,
          playerPayout: player.publicKey,
        })
        .signers([player])
        .rpc();
      assert.fail("Should have thrown AlreadySettled");
    } catch (err: any) {
      assert.include(err.message, "AlreadySettled");
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Settle Round
  // ──────────────────────────────────────────────────────────────────────────
  it("house settles the round with crash point 1.43x", async () => {
    const crashPointBps = new BN(143); // 1.43x
    const roundHash = Array.from(fakeRoundHash()); // [u8; 32]

    await program.methods
      .settleRound(crashPointBps, roundHash)
      .accounts({
        authority: authority.publicKey,
        gamePool: poolPDA,
        gameRound: roundPDA,
      })
      .rpc();

    const roundData = await program.account.gameRound.fetch(roundPDA);
    const poolData = await program.account.gamePool.fetch(poolPDA);

    assert.equal(roundData.settled, true, "round should be settled");
    assert.equal(
      roundData.crashPointBps.toNumber(),
      143,
      "crash point mismatch"
    );
    assert.equal(poolData.roundActive, false, "pool should show no active round");

    console.log("  ✓ Round settled at 1.43x");
  });

  it("rejects settling an already-settled round", async () => {
    try {
      await program.methods
        .settleRound(new BN(200), Array.from(fakeRoundHash()))
        .accounts({
          authority: authority.publicKey,
          gamePool: poolPDA,
          gameRound: roundPDA,
        })
        .rpc();
      assert.fail("Should have thrown RoundAlreadySettled");
    } catch (err: any) {
      assert.include(err.message, "RoundAlreadySettled");
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 6. Withdraw
  // ──────────────────────────────────────────────────────────────────────────
  it("house withdraws profits from the pool", async () => {
    const authorityBefore = await provider.connection.getBalance(
      authority.publicKey
    );
    const poolBefore = await provider.connection.getBalance(poolPDA);

    // Withdraw a small amount that exists due to busted bets
    const withdrawAmount = new BN(1_000_000); // 0.001 SOL

    await program.methods
      .withdraw(withdrawAmount)
      .accounts({
        authority: authority.publicKey,
        gamePool: poolPDA,
        destination: authority.publicKey,
      })
      .rpc();

    const poolAfter = await provider.connection.getBalance(poolPDA);
    const authorityAfter = await provider.connection.getBalance(
      authority.publicKey
    );

    assert.isBelow(poolAfter, poolBefore, "pool balance should decrease");
    console.log(
      `  ✓ Withdrew 0.001 SOL. Pool: ${poolBefore / LAMPORTS_PER_SOL} → ${poolAfter / LAMPORTS_PER_SOL} SOL`
    );
  });

  it("rejects withdraw from non-authority wallet", async () => {
    const rogue = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(rogue.publicKey, LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig, "confirmed");

    try {
      await program.methods
        .withdraw(new BN(1_000_000))
        .accounts({
          authority: rogue.publicKey,
          gamePool: poolPDA,
          destination: rogue.publicKey,
        })
        .signers([rogue])
        .rpc();
      assert.fail("Should have thrown Unauthorized");
    } catch (err: any) {
      assert.include(err.message, "Unauthorized");
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 7. Full Round 2 (no players — auto-skip verify)
  // ──────────────────────────────────────────────────────────────────────────
  it("runs round 2: start → settle (no bets)", async () => {
    const poolData = await program.account.gamePool.fetch(poolPDA);
    const nextRoundId = poolData.currentRound.add(new BN(1));
    const [round2PDA] = gameRoundPDA(programId, nextRoundId);

    await program.methods
      .startRound()
      .accounts({
        authority: authority.publicKey,
        gamePool: poolPDA,
        gameRound: round2PDA,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .settleRound(new BN(10000), Array.from(fakeRoundHash())) // 100x crash
      .accounts({
        authority: authority.publicKey,
        gamePool: poolPDA,
        gameRound: round2PDA,
      })
      .rpc();

    const round2Data = await program.account.gameRound.fetch(round2PDA);
    assert.equal(round2Data.settled, true);
    assert.equal(round2Data.roundId.toNumber(), 2);

    console.log("  ✓ Round 2 completed (no players)");
  });
});
