use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod events;
pub mod instructions;

use instructions::*;

declare_id!("11111111111111111111111111111111");

#[program]
pub mod matrix_game {
    use super::*;

    /// Initialize a new game instance
    pub fn initialize_game(ctx: Context<InitializeGame>) -> Result<()> {
        instructions::initialize_game::initialize_game(ctx)
    }

    /// Place a bet on a specific block
    pub fn place_bet(ctx: Context<PlaceBet>, block_number: u8, amount: u64) -> Result<()> {
        instructions::place_bet::place_bet(ctx, block_number, amount)
    }

    /// Finalize the game and select winning block
    pub fn finalize_game(ctx: Context<FinalizeGame>) -> Result<()> {
        instructions::finalize_game::finalize_game(ctx)
    }

    /// Claim winnings for winning bets
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        instructions::claim_winnings::claim_winnings(ctx)
    }

    /// Close game state account (creator only, after finalization)
    pub fn close_game_state(ctx: Context<CloseGameState>) -> Result<()> {
        instructions::close_accounts::close_game_state(ctx)
    }

    /// Close player bet account (player only, after claim or loss)
    pub fn close_player_bet(ctx: Context<ClosePlayerBet>) -> Result<()> {
        instructions::close_accounts::close_player_bet(ctx)
    }
}
