use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

// After `anchor build`, run `anchor keys list` to get your program ID.
// Replace the string below and update Anchor.toml [programs.devnet] to match.
declare_id!("CRaSHRouLetteProgram111111111111111111111111");

#[program]
pub mod crash_roulette {
    use super::*;

    // ─── Setup ────────────────────────────────────────────────────────────────

    /// Initialize the global game pool. Called once by the house.
    /// Creates a PDA that holds house funds and game state.
    ///
    /// `house_edge_bps` — House take in basis points (e.g., 300 = 3%).
    pub fn initialize(ctx: Context<Initialize>, house_edge_bps: u16) -> Result<()> {
        initialize::handler(ctx, house_edge_bps)
    }

    // ─── Round Lifecycle ──────────────────────────────────────────────────────

    /// Start a new betting round. Called by the house authority.
    /// Creates a GameRound PDA and opens the round for bets.
    pub fn start_round(ctx: Context<StartRound>) -> Result<()> {
        start_round::handler(ctx)
    }

    /// Player places a bet for the current round.
    /// Transfers `amount` lamports from the player to the game pool PDA.
    ///
    /// `amount`            — Bet size in lamports (MIN_BET–MAX_BET).
    /// `auto_cash_out_bps` — Auto cash-out multiplier × 100. 0 = manual.
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        amount: u64,
        auto_cash_out_bps: u64,
    ) -> Result<()> {
        place_bet::handler(ctx, amount, auto_cash_out_bps)
    }

    /// Player cashes out during a live round.
    ///
    /// Requires BOTH the player's signature AND the house authority's signature.
    /// The authority's co-signature certifies the `multiplier_bps` value is
    /// the legitimate live multiplier at the moment of cash-out.
    ///
    /// `multiplier_bps` — Current multiplier × 100 (e.g., 175 = 1.75x).
    pub fn cash_out(ctx: Context<CashOut>, multiplier_bps: u64) -> Result<()> {
        cash_out::handler(ctx, multiplier_bps)
    }

    /// Settle the current round after it crashes. Called by the house authority.
    ///
    /// Records the crash point and seed hash on-chain. Bets that were not
    /// cashed out before this call are busted; their SOL stays in the pool.
    ///
    /// `crash_point_bps` — Crash point × 100 (e.g., 143 = 1.43x).
    /// `round_hash`      — SHA-256 hash of the round seed (32 bytes).
    pub fn settle_round(
        ctx: Context<SettleRound>,
        crash_point_bps: u64,
        round_hash: [u8; 32],
    ) -> Result<()> {
        settle::handler(ctx, crash_point_bps, round_hash)
    }

    // ─── House Operations ─────────────────────────────────────────────────────

    /// Withdraw accumulated SOL profits from the game pool.
    /// Only callable by the house authority.
    ///
    /// `amount` — Lamports to withdraw. Must leave pool rent-exempt.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        withdraw::handler(ctx, amount)
    }
}
