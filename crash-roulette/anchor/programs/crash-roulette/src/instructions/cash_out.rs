use anchor_lang::prelude::*;
use crate::state::{GamePool, GameRound, PlayerBet};
use crate::errors::CrashError;

/// Accounts for cash_out.
///
/// Design: Both the **player** and the **house authority** must sign.
///   - Player signature  → proves the player consented to cash out now.
///   - Authority signature → proves the house verified the live multiplier at
///     the moment of cash-out (the authority cannot be impersonated since the
///     game_pool account enforces `has_one = authority`).
///
/// Flow:
///   1. Player clicks "Cash Out" → WebSocket event sent to server.
///   2. Server records the current multiplier.
///   3. Server returns a partially-signed transaction to the frontend.
///   4. Frontend asks the player's wallet to co-sign.
///   5. Frontend broadcasts the fully-signed transaction.
#[derive(Accounts)]
pub struct CashOut<'info> {
    /// The player cashing out. Must sign.
    #[account(mut)]
    pub player: Signer<'info>,

    /// The house authority. Must also sign (verifies the multiplier is legitimate).
    pub authority: Signer<'info>,

    /// Game pool — source of payout SOL.
    #[account(
        mut,
        seeds = [GamePool::SEEDS],
        bump = game_pool.bump,
        has_one = authority @ CrashError::Unauthorized,
    )]
    pub game_pool: Account<'info, GamePool>,

    /// The active round.
    #[account(
        mut,
        seeds = [
            GameRound::SEEDS_PREFIX,
            game_round.round_id.to_le_bytes().as_ref(),
        ],
        bump = game_round.bump,
        constraint = !game_round.settled @ CrashError::RoundAlreadySettled,
    )]
    pub game_round: Account<'info, GameRound>,

    /// The player's bet for this round.
    #[account(
        mut,
        seeds = [
            PlayerBet::SEEDS_PREFIX,
            player.key().as_ref(),
            game_round.round_id.to_le_bytes().as_ref(),
        ],
        bump = player_bet.bump,
        constraint = player_bet.player == player.key() @ CrashError::Unauthorized,
        constraint = !player_bet.settled @ CrashError::AlreadySettled,
    )]
    pub player_bet: Account<'info, PlayerBet>,

    /// CHECK: This is the player's wallet (lamport destination).
    /// We verify it matches player_bet.player above.
    #[account(
        mut,
        constraint = player_payout.key() == player.key(),
    )]
    pub player_payout: AccountInfo<'info>,
}

/// Cash out a player's bet at the given multiplier.
///
/// # Arguments
/// * `multiplier_bps` — The multiplier × 100 at which the player is cashing out
///   (e.g., 175 = 1.75x). The house authority signs to certify this value.
pub fn handler(ctx: Context<CashOut>, multiplier_bps: u64) -> Result<()> {
    // ── Validate multiplier ──
    require!(multiplier_bps >= 100, CrashError::InvalidMultiplier); // ≥ 1.00x
    require!(multiplier_bps <= 100_000, CrashError::MultiplierTooHigh); // ≤ 1000x

    let bet_amount = ctx.accounts.player_bet.amount;

    // ── Calculate payout: bet × (multiplier / 100) ──
    // Use u128 for intermediate to avoid overflow before dividing
    let payout = (bet_amount as u128)
        .checked_mul(multiplier_bps as u128)
        .ok_or(CrashError::ArithmeticOverflow)?
        .checked_div(100)
        .ok_or(CrashError::ArithmeticOverflow)? as u64;

    // ── Check pool has enough lamports ──
    // game_pool lamports = rent-exempt reserve + accumulated bets - payouts already made
    let pool_lamports = ctx.accounts.game_pool.to_account_info().lamports();
    require!(pool_lamports >= payout, CrashError::InsufficientLiquidity);

    // ── Transfer SOL: game_pool PDA → player ──
    // Because the game_pool PDA is owned by this program, we can directly
    // manipulate its lamports (no CPI needed).
    **ctx
        .accounts
        .game_pool
        .to_account_info()
        .try_borrow_mut_lamports()? -= payout;
    **ctx
        .accounts
        .player_payout
        .to_account_info()
        .try_borrow_mut_lamports()? += payout;

    // ── Update player bet ──
    let bet = &mut ctx.accounts.player_bet;
    bet.cashed_out_at_bps = multiplier_bps;
    bet.payout = payout;
    bet.settled = true;

    // ── Update round stats ──
    let round = &mut ctx.accounts.game_round;
    round.total_paid_out = round
        .total_paid_out
        .checked_add(payout)
        .ok_or(CrashError::ArithmeticOverflow)?;

    // ── Update global pool stats ──
    let pool = &mut ctx.accounts.game_pool;
    pool.total_paid_out = pool
        .total_paid_out
        .checked_add(payout)
        .ok_or(CrashError::ArithmeticOverflow)?;

    msg!(
        "Cash out: {} cashed out at {}x, payout {} lamports (round {})",
        ctx.accounts.player_bet.player,
        multiplier_bps,
        payout,
        round.round_id,
    );

    Ok(())
}
