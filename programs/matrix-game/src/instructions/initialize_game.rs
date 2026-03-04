use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::state::GameState;
use crate::events::GameInitialized;

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    /// The creator/authority of the game
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The game state PDA
    #[account(
        init,
        payer = creator,
        space = GameState::SIZE,
        seeds = [b"game", creator.key().as_ref()],
        bump
    )]
    pub game_state: Account<'info, GameState>,

    /// System program for account creation
    pub system_program: Program<'info, System>,

    /// Clock sysvar for timestamps
    pub clock: Sysvar<'info, Clock>,
}

pub fn initialize_game(ctx: Context<InitializeGame>) -> Result<()> {
    let game = &mut ctx.accounts.game_state;
    let clock = &ctx.accounts.clock;

    game.bump = ctx.bumps.game_state;
    game.creator = ctx.accounts.creator.key();
    game.is_active = true;
    game.total_pool = 0;
    game.winning_block = None;
    game.blocks_bet_count = [0; 9];
    game.blocks_total_amount = [0; 9];
    game.randomness_slot = 0;
    game.game_created_at = clock.unix_timestamp;

    emit!(GameInitialized {
        game: game.key(),
        creator: game.creator,
    });

    Ok(())
}
