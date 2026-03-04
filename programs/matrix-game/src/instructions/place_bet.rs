use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::state::{GameState, PlayerBet};
use crate::errors::GameError;
use crate::events::BetPlaced;

#[derive(Accounts)]
#[instruction(block_number: u8, amount: u64)]
pub struct PlaceBet<'info> {
    /// The player placing the bet
    #[account(mut)]
    pub player: Signer<'info>,

    /// The game state
    #[account(
        mut,
        seeds = [b"game", game_state.creator.as_ref()],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    /// The player's bet account (PDA)
    #[account(
        init,
        payer = player,
        space = PlayerBet::SIZE,
        seeds = [b"bet", game_state.key().as_ref(), player.key().as_ref()],
        bump
    )]
    pub player_bet: Account<'info, PlayerBet>,

    /// The game vault to receive SOL
    /// CHECK: Must be provided by the client, will be checked in instruction
    #[account(mut)]
    pub game_vault: UncheckedAccount<'info>,

    /// System program for transfers
    pub system_program: Program<'info, System>,

    /// Clock sysvar for timestamps
    pub clock: Sysvar<'info, Clock>,
}

pub fn place_bet(
    ctx: Context<PlaceBet>,
    block_number: u8,
    amount: u64,
) -> Result<()> {
    // Validate inputs
    require!(block_number < 9, GameError::InvalidBlockNumber);
    require!(amount > 0, GameError::InvalidBetAmount);

    let game = &mut ctx.accounts.game_state;
    let clock = &ctx.accounts.clock;

    // Check game is active
    require!(game.is_active, GameError::GameNotActive);
    require!(game.winning_block.is_none(), GameError::GameFinalized);

    // Transfer SOL from player to game vault
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.player.to_account_info(),
            to: ctx.accounts.game_vault.to_account_info(),
        },
    );
    transfer(cpi_context, amount)?;

    // Create PlayerBet PDA
    let player_bet = &mut ctx.accounts.player_bet;
    player_bet.bump = ctx.bumps.player_bet;
    player_bet.player = ctx.accounts.player.key();
    player_bet.game = game.key();
    player_bet.block_number = block_number;
    player_bet.bet_amount = amount;
    player_bet.is_winner = None;
    player_bet.payout_claimed = false;
    player_bet.created_at = clock.unix_timestamp;

    // Update game state
    game.total_pool = game
        .total_pool
        .checked_add(amount)
        .ok_or(GameError::PoolOverflow)?;

    game.blocks_bet_count[block_number as usize] = game.blocks_bet_count[block_number as usize]
        .checked_add(1)
        .ok_or(GameError::BetCountOverflow)?;

    game.blocks_total_amount[block_number as usize] = game.blocks_total_amount
        [block_number as usize]
        .checked_add(amount)
        .ok_or(GameError::AmountOverflow)?;

    emit!(BetPlaced {
        player: ctx.accounts.player.key(),
        block: block_number,
        amount,
        game: game.key(),
    });

    Ok(())
}
