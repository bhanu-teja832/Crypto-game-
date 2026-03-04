use anchor_lang::prelude::*;

use crate::state::FeeVault;
use crate::errors::GameError;
use crate::events::FeesWithdrawn;

#[derive(Accounts)]
pub struct WithdrawFees<'info> {
    /// The creator withdrawing fees
    #[account(mut)]
    pub creator: Signer<'info>,

    /// The fee vault
    #[account(
        mut,
        seeds = [b"fee_vault", creator.key().as_ref()],
        bump = fee_vault.bump
    )]
    pub fee_vault: Account<'info, FeeVault>,
}

pub fn withdraw_fees(ctx: Context<WithdrawFees>) -> Result<()> {
    let fee_vault = &mut ctx.accounts.fee_vault;
    let creator_key = ctx.accounts.creator.key();

    // Verify creator is the fee recipient
    require!(fee_vault.creator == creator_key, GameError::Unauthorized);

    // Calculate withdrawable amount
    let available_fees = fee_vault
        .accumulated_fees
        .checked_sub(fee_vault.withdrawn)
        .ok_or(GameError::InvalidProgramState)?;

    require!(available_fees > 0, GameError::InsufficientFunds);

    // Mark fees as withdrawn
    // The actual transfer of SOL happens when closing the fee_vault account
    fee_vault.withdrawn = fee_vault
        .withdrawn
        .checked_add(available_fees)
        .ok_or(GameError::PoolOverflow)?;

    emit!(FeesWithdrawn {
        creator: creator_key,
        amount: available_fees,
    });

    Ok(())
}
