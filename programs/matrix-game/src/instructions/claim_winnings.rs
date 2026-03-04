use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

use crate::state::{GameState, PlayerBet};
use crate::errors::GameError;
use crate::events::WinningsClaimed;

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    /// The player claiming winnings
    #[account(mut)]
    pub player: Signer<'info>,

    /// The game state
    #[account(
        mut,
        seeds = [b"game", game_state.creator.as_ref()],
        bump = game_state.bump
    )]
    pub game_state: Account<'info, GameState>,

    /// The player's bet
    #[account(
        mut,
        seeds = [b"bet", game_state.key().as_ref(), player.key().as_ref()],
        bump = player_bet.bump
    )]
    pub player_bet: Account<'info, PlayerBet>,

    /// The game vault to send SOL from
    /// CHECK: Must be provided, will be verified in instruction
    #[account(mut)]
    pub game_vault: UncheckedAccount<'info>,

    /// System program for transfers
    pub system_program: Program<'info, System>,
}

pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
    let game = &ctx.accounts.game_state;
    let player_bet = &mut ctx.accounts.player_bet;

    // Verify game is finalized
    let winning_block = game.winning_block.ok_or(GameError::GameNotFinalized)?;

    // Verify this player bet on winning block
    require!(
        player_bet.block_number == winning_block,
        GameError::NotAWinner
    );

    // Verify not already claimed
    require!(!player_bet.payout_claimed, GameError::AlreadyClaimed);

    // Calculate payouts (95% to winners, 5% stays in vault for creator fee)
    let winners_count = game.blocks_bet_count[winning_block as usize] as u64;
    let winning_pool = game.total_pool.checked_mul(95).ok_or(GameError::PoolOverflow)? / 100;
    let payout_per_winner = winning_pool.checked_div(winners_count).ok_or(GameError::InvalidProgramState)?;

    // Transfer payout to player from game vault
    let seeds = &[b"game".as_ref(), game.creator.as_ref(), &[game.bump]];
    let signer = &[&seeds[..]];

    let cpi_context = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.game_vault.to_account_info(),
            to: ctx.accounts.player.to_account_info(),
        },
        signer,
    );
    transfer(cpi_context, payout_per_winner)?;

    // Mark as claimed
    player_bet.is_winner = Some(true);
    player_bet.payout_claimed = true;

    emit!(WinningsClaimed {
        player: ctx.accounts.player.key(),
        amount: payout_per_winner,
        game: game.key(),
    });

    Ok(())
}
