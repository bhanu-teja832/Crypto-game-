use anchor_lang::prelude::*;

/// Represents one round of the crash game. Created by start_round, settled by settle_round.
#[account]
pub struct GameRound {
    /// Which round number this is (matches game_pool.current_round).
    pub round_id: u64,
    /// Crash point × 100 (e.g., 250 = 2.50x). Zero until the round is settled.
    pub crash_point_bps: u64,
    /// SHA-256 hash of the round seed. Published after crash for provable fairness.
    /// Stored as 32 bytes (the raw hash bytes).
    pub round_hash: [u8; 32],
    /// Total lamports wagered this round.
    pub total_wagered: u64,
    /// Total lamports paid out this round.
    pub total_paid_out: u64,
    /// Number of bets placed this round.
    pub player_count: u16,
    /// Whether settle_round has been called.
    pub settled: bool,
    /// Unix timestamp (seconds) when the round started.
    pub started_at: i64,
    /// Unix timestamp (seconds) when the round crashed. Zero until settled.
    pub crashed_at: i64,
    /// PDA bump seed.
    pub bump: u8,
}

impl GameRound {
    /// 8 + 8 + 8 + 32 + 8 + 8 + 2 + 1 + 8 + 8 + 1 = 92 bytes
    pub const SIZE: usize = 8 + 8 + 8 + 32 + 8 + 8 + 2 + 1 + 8 + 8 + 1;

    /// Seeds prefix for deriving round PDAs.
    pub const SEEDS_PREFIX: &'static [u8] = b"game_round";
}
