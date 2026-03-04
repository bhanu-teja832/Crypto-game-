use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{GamePool, GameRound, PlayerBet};
use crate::errors::CrashError;

// Bet limits in lamports
const MIN_BET: u64 = 10_000_000;       // 0.01 SOL
const MAX_BET: u64 = 10_000_000_000;  // 10.00 SOL

/// Accounts for place_bet.
#[derive(Accounts)]
pub struct PlaceBet<'info> {
    /// The player — signs the transaction and pays for the bet + account rent.
    #[account(mut)]
    pub player: Signer<'info>,

    /// Game pool — receives the wagered SOL and tracks round state.
    #[account(
        mut,
        seeds = [GamePool::SEEDS],
        bump = game_pool.bump,
    )]
    pub game_pool: Account<'info, GamePool>,

    /// Current active round.
    #[account(
        mut,
        seeds = [
            GameRound::SEEDS_PREFIX,
            game_pool.current_round.to_le_bytes().as_ref(),
        ],
        bump = game_round.bump,
        constraint = game_round.round_id == game_pool.current_round @ CrashError::NoActiveRound,
        constraint = !game_round.settled @ CrashError::RoundAlreadySettled,
    )]
    pub game_round: Account<'info, GameRound>,

    /// Player's bet account for this round — created here.
    /// Seeds include the player key + round ID so each player can only bet once per round.
    #[account(
        init,
        payer = player,
        space = PlayerBet::SIZE,
        seeds = [
            PlayerBet::SEEDS_PREFIX,
            player.key().as_ref(),
            game_pool.current_round.to_le_bytes().as_ref(),
        ],
        bump,
    )]
    pub player_bet: Account<'info, PlayerBet>,

    pub system_program: Program<'info, System>,
}

/// Place a bet for the current round.
///
/// # Arguments
/// * `amount` — Bet size in lamports (0.01–10 SOL).
/// * `auto_cash_out_bps` — Auto cash-out multiplier × 100 (e.g., 250 = 2.50x).
///   Pass 0 to disable auto cash-out (manual only).
pub fn handler(
    ctx: Context<PlaceBet>,
    amount: u64,
    auto_cash_out_bps: u64,
) -> Result<()> {
    // ── Validate round state ──
    require!(ctx.accounts.game_pool.round_active, CrashError::NoActiveRound);

    // ── Validate bet size ──
    require!(amount >= MIN_BET, CrashError::BetTooSmall);
    require!(amount <= MAX_BET, CrashError::BetTooLarge);

    // ── Validate auto cash-out (if provided) ──
    if auto_cash_out_bps > 0 {
        require!(auto_cash_out_bps >= 100, CrashError::InvalidMultiplier); // ≥ 1.00x
        require!(auto_cash_out_bps <= 100_000, CrashError::MultiplierTooHigh); // ≤ 1000x
    }

    // ── Transfer SOL: player → game_pool PDA ──
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.player.to_account_info(),
            to: ctx.accounts.game_pool.to_account_info(),
        },
    );
    system_program::transfer(cpi_ctx, amount)?;

    // ── Record the bet ──
    let bet = &mut ctx.accounts.player_bet;
    bet.player = ctx.accounts.player.key();
    bet.round_id = ctx.accounts.game_pool.current_round;
    bet.amount = amount;
    bet.auto_cash_out_bps = auto_cash_out_bps;
    bet.cashed_out_at_bps = 0;
    bet.payout = 0;
    bet.settled = false;
    bet.placed_at = Clock::get()?.unix_timestamp;
    bet.bump = ctx.bumps.player_bet;

    // ── Update round stats ──
    let round = &mut ctx.accounts.game_round;
    round.total_wagered = round
        .total_wagered
        .checked_add(amount)
        .ok_or(CrashError::ArithmeticOverflow)?;
    round.player_count = round
        .player_count
        .checked_add(1)
        .ok_or(CrashError::ArithmeticOverflow)?;

    // ── Update global pool stats ──
    let pool = &mut ctx.accounts.game_pool;
    pool.total_wagered = pool
        .total_wagered
        .checked_add(amount)
        .ok_or(CrashError::ArithmeticOverflow)?;

    msg!(
        "Bet placed: {} lamports by {} (round {})",
        amount,
        ctx.accounts.player_bet.player,
        bet.round_id,
    );

    Ok(())
}
