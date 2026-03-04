use anchor_lang::prelude::*;

#[event]
pub struct BetPlaced {
    pub player: Pubkey,
    pub block: u8,
    pub amount: u64,
    pub game: Pubkey,
}

#[event]
pub struct GameFinalized {
    pub game: Pubkey,
    pub winning_block: u8,
    pub total_pool: u64,
    pub winners_on_block: u32,
}

#[event]
pub struct WinningsClaimed {
    pub player: Pubkey,
    pub amount: u64,
    pub game: Pubkey,
}

#[event]
pub struct FeesWithdrawn {
    pub creator: Pubkey,
    pub amount: u64,
}

#[event]
pub struct GameInitialized {
    pub game: Pubkey,
    pub creator: Pubkey,
}
