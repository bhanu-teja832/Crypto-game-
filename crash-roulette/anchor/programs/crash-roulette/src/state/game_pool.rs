use anchor_lang::prelude::*;

/// The global house account. One instance per program, owned by the house authority.
/// Acts as a pool/escrow: player bets flow in, payouts flow out.
#[account]
pub struct GamePool {
    /// Wallet that controls the house (can call start_round, settle_round, withdraw).
    pub authority: Pubkey,
    /// House edge in basis points. 300 = 3.00%.
    /// Note: house edge is enforced off-chain during crash point generation.
    /// This field is stored for transparency and audit purposes.
    pub house_edge_bps: u16,
    /// Running total of all lamports wagered across all rounds.
    pub total_wagered: u64,
    /// Running total of all lamports ever paid out.
    pub total_paid_out: u64,
    /// Current active round number (incremented each round by start_round).
    pub current_round: u64,
    /// Whether a round is currently active (accepting bets or running).
    pub round_active: bool,
    /// PDA bump seed.
    pub bump: u8,
}

impl GamePool {
    /// 8 (discriminator) + 32 + 2 + 8 + 8 + 8 + 1 + 1 = 68 bytes
    pub const SIZE: usize = 8 + 32 + 2 + 8 + 8 + 8 + 1 + 1;

    /// Seeds used to derive this PDA.
    pub const SEEDS: &'static [u8] = b"game_pool";
}
