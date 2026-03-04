use anchor_lang::prelude::*;
use crate::state::{GamePool, GameRound};
use crate::errors::CrashError;

/// Accounts for start_round.
#[derive(Accounts)]
pub struct StartRound<'info> {
    /// Must be the house authority.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Global game pool — we read current_round and set round_active.
    #[account(
        mut,
        seeds = [GamePool::SEEDS],
        bump = game_pool.bump,
        has_one = authority @ CrashError::Unauthorized,
    )]
    pub game_pool: Account<'info, GamePool>,

    /// The new round account. PDA derived from the next round number.
    #[account(
        init,
        payer = authority,
        space = GameRound::SIZE,
        seeds = [
            GameRound::SEEDS_PREFIX,
            (game_pool.current_round + 1).to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub game_round: Account<'info, GameRound>,

    pub system_program: Program<'info, System>,
}

/// Start a new betting round.
/// Increments the round counter and creates the GameRound account.
/// Players can now call place_bet.
pub fn handler(ctx: Context<StartRound>) -> Result<()> {
    let pool = &mut ctx.accounts.game_pool;

    require!(!pool.round_active, CrashError::RoundAlreadyActive);

    pool.current_round = pool
        .current_round
        .checked_add(1)
        .ok_or(CrashError::ArithmeticOverflow)?;
    pool.round_active = true;

    let round = &mut ctx.accounts.game_round;
    round.round_id = pool.current_round;
    round.crash_point_bps = 0;
    round.round_hash = [0u8; 32];
    round.total_wagered = 0;
    round.total_paid_out = 0;
    round.player_count = 0;
    round.settled = false;
    round.started_at = Clock::get()?.unix_timestamp;
    round.crashed_at = 0;
    round.bump = ctx.bumps.game_round;

    msg!("Round {} started.", pool.current_round);

    Ok(())
}
