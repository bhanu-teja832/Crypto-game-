use anchor_lang::prelude::*;

#[error_code]
pub enum CrashError {
    // ─── Bet Validation ───
    #[msg("Bet amount is below the minimum (0.01 SOL)")]
    BetTooSmall,
    #[msg("Bet amount exceeds the maximum (10 SOL)")]
    BetTooLarge,
    #[msg("Player has already placed a bet this round")]
    AlreadyBetThisRound,

    // ─── Round State ───
    #[msg("No round is currently active")]
    NoActiveRound,
    #[msg("A round is already active — wait for it to end")]
    RoundAlreadyActive,
    #[msg("Round is not in the betting phase; bets are closed")]
    BettingClosed,
    #[msg("Round has already been settled")]
    RoundAlreadySettled,
    #[msg("Round has not been settled yet")]
    RoundNotSettled,

    // ─── Cash-Out ───
    #[msg("Player has already cashed out or been busted")]
    AlreadySettled,
    #[msg("Multiplier must be at least 1.00x (100 bps)")]
    InvalidMultiplier,
    #[msg("Multiplier exceeds the maximum allowed (1000x)")]
    MultiplierTooHigh,

    // ─── Settlement ───
    #[msg("Crash point must be at least 1.00x (100 bps)")]
    InvalidCrashPoint,

    // ─── Liquidity ───
    #[msg("Game pool has insufficient lamports to cover this payout")]
    InsufficientLiquidity,
    #[msg("Withdrawal amount exceeds available pool profits")]
    InsufficientProfit,

    // ─── Authorization ───
    #[msg("Only the house authority can call this instruction")]
    Unauthorized,

    // ─── Arithmetic ───
    #[msg("Arithmetic overflow in payout calculation")]
    ArithmeticOverflow,
}
