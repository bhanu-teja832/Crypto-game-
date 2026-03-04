use anchor_lang::prelude::*;

/// Stores the main game state for a 3x3 matrix betting game
#[account]
pub struct GameState {
    /// PDA bump seed for signing
    pub bump: u8,

    /// Creator/authority of this game
    pub creator: Pubkey,

    /// Whether the game is accepting new bets
    pub is_active: bool,

    /// Total SOL in the pool
    pub total_pool: u64,

    /// The winning block (0-8), None if game not finalized
    pub winning_block: Option<u8>,

    /// Number of bets placed on each block (0-8)
    pub blocks_bet_count: [u32; 9],

    /// Total SOL bet on each block
    pub blocks_total_amount: [u64; 9],

    /// Slot number when game was finalized (for randomness verification)
    pub randomness_slot: u64,

    /// Unix timestamp when game was created
    pub game_created_at: i64,
}

impl GameState {
    const DISCRIMINATOR_SIZE: usize = 8;
    const BUMP_SIZE: usize = 1;
    const CREATOR_SIZE: usize = 32;
    const IS_ACTIVE_SIZE: usize = 1;
    const TOTAL_POOL_SIZE: usize = 8;
    const WINNING_BLOCK_SIZE: usize = 2; // Option<u8>
    const BLOCKS_BET_COUNT_SIZE: usize = 4 * 9;
    const BLOCKS_TOTAL_AMOUNT_SIZE: usize = 8 * 9;
    const RANDOMNESS_SLOT_SIZE: usize = 8;
    const GAME_CREATED_AT_SIZE: usize = 8;

    pub const SIZE: usize = Self::DISCRIMINATOR_SIZE
        + Self::BUMP_SIZE
        + Self::CREATOR_SIZE
        + Self::IS_ACTIVE_SIZE
        + Self::TOTAL_POOL_SIZE
        + Self::WINNING_BLOCK_SIZE
        + Self::BLOCKS_BET_COUNT_SIZE
        + Self::BLOCKS_TOTAL_AMOUNT_SIZE
        + Self::RANDOMNESS_SLOT_SIZE
        + Self::GAME_CREATED_AT_SIZE;
}

/// Stores individual player bets
#[account]
pub struct PlayerBet {
    /// PDA bump seed for signing
    pub bump: u8,

    /// The player who placed this bet
    pub player: Pubkey,

    /// Reference to the GameState account
    pub game: Pubkey,

    /// Which block (0-8) was bet on
    pub block_number: u8,

    /// Amount of SOL bet (in lamports)
    pub bet_amount: u64,

    /// Whether this bet was a winner (None = game not finalized)
    pub is_winner: Option<bool>,

    /// Has the player claimed their winnings
    pub payout_claimed: bool,

    /// Unix timestamp when bet was placed
    pub created_at: i64,
}

impl PlayerBet {
    const DISCRIMINATOR_SIZE: usize = 8;
    const BUMP_SIZE: usize = 1;
    const PLAYER_SIZE: usize = 32;
    const GAME_SIZE: usize = 32;
    const BLOCK_NUMBER_SIZE: usize = 1;
    const BET_AMOUNT_SIZE: usize = 8;
    const IS_WINNER_SIZE: usize = 2; // Option<bool>
    const PAYOUT_CLAIMED_SIZE: usize = 1;
    const CREATED_AT_SIZE: usize = 8;

    pub const SIZE: usize = Self::DISCRIMINATOR_SIZE
        + Self::BUMP_SIZE
        + Self::PLAYER_SIZE
        + Self::GAME_SIZE
        + Self::BLOCK_NUMBER_SIZE
        + Self::BET_AMOUNT_SIZE
        + Self::IS_WINNER_SIZE
        + Self::PAYOUT_CLAIMED_SIZE
        + Self::CREATED_AT_SIZE;
}

/// Accumulates fees for the game creator
#[account]
pub struct FeeVault {
    /// PDA bump seed for signing
    pub bump: u8,

    /// The fee recipient (creator)
    pub creator: Pubkey,

    /// Total fees accumulated (in lamports)
    pub accumulated_fees: u64,

    /// Total fees withdrawn (in lamports)
    pub withdrawn: u64,

    /// Reference to the last game
    pub last_game: Pubkey,
}

impl FeeVault {
    const DISCRIMINATOR_SIZE: usize = 8;
    const BUMP_SIZE: usize = 1;
    const CREATOR_SIZE: usize = 32;
    const ACCUMULATED_FEES_SIZE: usize = 8;
    const WITHDRAWN_SIZE: usize = 8;
    const LAST_GAME_SIZE: usize = 32;

    pub const SIZE: usize = Self::DISCRIMINATOR_SIZE
        + Self::BUMP_SIZE
        + Self::CREATOR_SIZE
        + Self::ACCUMULATED_FEES_SIZE
        + Self::WITHDRAWN_SIZE
        + Self::LAST_GAME_SIZE;
}
