use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;

use crate::state::GameState;
use crate::errors::GameError;
use crate::events::GameFinalized;

#[derive(Accounts)]
pub struct FinalizeGame<'info> {
    /// The game state
    #[account(
        mut,
        seeds = [b"game", game_state.creator.as_ref()],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    /// Clock sysvar for randomness
    pub clock: Sysvar<'info, Clock>,
}

pub fn finalize_game(ctx: Context<FinalizeGame>) -> Result<()> {
    let game = &mut ctx.accounts.game_state;
    let clock = &ctx.accounts.clock;
    let game_pubkey = game.key();

    // Only allow finalization if active
    require!(game.is_active, GameError::GameNotActive);
    require!(game.winning_block.is_none(), GameError::AlreadyFinalized);

    // Require minimum bets (at least 1 block has bets)
    let has_bets = game.blocks_bet_count.iter().any(|&count| count > 0);
    require!(has_bets, GameError::NoBetsOnGame);

    // Generate winning block using randomness
    let winning_block = select_winning_block(&game_pubkey, clock)?;

    // Store winning block
    game.winning_block = Some(winning_block);
    game.randomness_slot = clock.slot;

    // Count winners on the winning block
    let winners_count = game.blocks_bet_count[winning_block as usize];

    emit!(GameFinalized {
        game: game_pubkey,
        winning_block,
        total_pool: game.total_pool,
        winners_on_block: winners_count,
    });

    Ok(())
}

/// Select winning block using deterministic randomness
/// Formula: hash(game_pubkey + slot) % 9
fn select_winning_block(game_pubkey: &Pubkey, clock: &Clock) -> Result<u8> {
    let mut hash_input = [0u8; 40];

    // Copy game pubkey (32 bytes)
    hash_input[0..32].copy_from_slice(&game_pubkey.to_bytes());

    // Copy slot number (8 bytes)
    hash_input[32..40].copy_from_slice(&clock.slot.to_le_bytes());

    // Hash the combined input
    let hash_result = hash(&hash_input);

    // Use first byte modulo 9
    let winning_block = hash_result.to_bytes()[0] % 9;

    Ok(winning_block as u8)
}
