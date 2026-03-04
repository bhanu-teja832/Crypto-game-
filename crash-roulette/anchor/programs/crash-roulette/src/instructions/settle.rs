use anchor_lang::prelude::*;
use crate::state::{GamePool, GameRound};
use crate::errors::CrashError;

/// Accounts for settle_round.
#[derive(Accounts)]
pub struct SettleRound<'info> {
    /// House authority — only they can settle rounds.
    pub authority: Signer<'info>,

    /// Game pool — updated to mark round as inactive.
    #[account(
        mut,
        seeds = [GamePool::SEEDS],
        bump = game_pool.bump,
        has_one = authority @ CrashError::Unauthorized,
    )]
    pub game_pool: Account<'info, GamePool>,

    /// The round being settled.
    #[account(
        mut,
        seeds = [
            GameRound::SEEDS_PREFIX,
            game_round.round_id.to_le_bytes().as_ref(),
        ],
        bump = game_round.bump,
        constraint = game_round.round_id == game_pool.current_round @ CrashError::NoActiveRound,
        constraint = !game_round.settled @ CrashError::RoundAlreadySettled,
    )]
    pub game_round: Account<'info, GameRound>,
}

/// Settle the current round after it crashes.
///
/// Records the crash point and seed hash; marks the round as settled.
/// All bets that were NOT cashed out before this call are considered busted —
/// their SOL remains in the game_pool (house keeps it).
///
/// # Arguments
/// * `crash_point_bps` — Crash point × 100 (e.g., 143 = 1.43x).
/// * `round_hash`      — SHA-256 hash of the round seed (32 bytes, hex-decoded).
///   Published here so players can verify the crash point off-chain.
pub fn handler(
    ctx: Context<SettleRound>,
    crash_point_bps: u64,
    round_hash: [u8; 32],
) -> Result<()> {
    require!(crash_point_bps >= 100, CrashError::InvalidCrashPoint); // ≥ 1.00x
    require!(crash_point_bps <= 100_000, CrashError::MultiplierTooHigh);

    let round = &mut ctx.accounts.game_round;
    round.crash_point_bps = crash_point_bps;
    round.round_hash = round_hash;
    round.settled = true;
    round.crashed_at = Clock::get()?.unix_timestamp;

    // Mark the pool as no longer having an active round
    ctx.accounts.game_pool.round_active = false;

    msg!(
        "Round {} settled. Crash at {}x. Hash: {:?}",
        round.round_id,
        crash_point_bps,
        round_hash,
    );

    Ok(())
}
