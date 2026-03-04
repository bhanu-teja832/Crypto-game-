use anchor_lang::prelude::*;

/// Records a single player's bet for one round.
/// Created when the player calls place_bet; updated when they cash out or bust.
#[account]
pub struct PlayerBet {
    /// The player's wallet public key.
    pub player: Pubkey,
    /// Round this bet belongs to.
    pub round_id: u64,
    /// Amount wagered in lamports.
    pub amount: u64,
    /// Auto cash-out threshold × 100 (e.g., 250 = 2.50x). 0 means manual only.
    pub auto_cash_out_bps: u64,
    /// Multiplier × 100 at which player cashed out. 0 = not cashed out yet.
    pub cashed_out_at_bps: u64,
    /// Actual payout in lamports. 0 = not paid out yet.
    pub payout: u64,
    /// Whether the bet has been settled (cashed out or busted).
    pub settled: bool,
    /// Unix timestamp when the bet was placed.
    pub placed_at: i64,
    /// PDA bump seed.
    pub bump: u8,
}

impl PlayerBet {
    /// 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 1 = 90 bytes
    pub const SIZE: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 + 1;

    /// Seeds prefix for deriving player bet PDAs.
    pub const SEEDS_PREFIX: &'static [u8] = b"player_bet";
}
