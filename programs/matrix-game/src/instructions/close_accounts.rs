use anchor_lang::prelude::*;

use crate::state::{GameState, PlayerBet};
use crate::errors::GameError;

#[derive(Accounts)]
pub struct CloseGameState<'info> {
    /// The creator (authority)
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The game state to close
    #[account(
        mut,
        seeds = [b"game", creator.key().as_ref()],
        bump = game_state.bump,
        close = creator
    )]
    pub game_state: Account<'info, GameState>,
}

#[derive(Accounts)]
pub struct ClosePlayerBet<'info> {
    /// The player who placed the bet
    #[account(mut)]
    pub player: Signer<'info>,

    /// The game state
    pub game_state: Account<'info, GameState>,

    /// The player bet to close
    #[account(
        mut,
        seeds = [b"bet", game_state.key().as_ref(), player.key().as_ref()],
        bump = player_bet.bump,
        close = player
    )]
    pub player_bet: Account<'info, PlayerBet>,
}

pub fn close_game_state(ctx: Context<CloseGameState>) -> Result<()> {
    let game_state = &ctx.accounts.game_state;

    // Game must be finalized before closing
    require!(game_state.winning_block.is_some(), GameError::GameNotFinalized);

    // Verify creator is the authority
    require!(
        game_state.creator == ctx.accounts.creator.key(),
        GameError::Unauthorized
    );

    // Game will be closed by the account close constraint in the Accounts macro
    Ok(())
}

pub fn close_player_bet(ctx: Context<ClosePlayerBet>) -> Result<()> {
    let player_bet = &ctx.accounts.player_bet;

    // Bet must have been claimed or loser before closing
    require!(player_bet.payout_claimed || player_bet.is_winner == Some(false), GameError::InvalidProgramState);

    // Player bet will be closed by the account close constraint in the Accounts macro
    Ok(())
}
