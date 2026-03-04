use anchor_lang::prelude::*;
use crate::state::GamePool;
use crate::errors::CrashError;

/// Accounts for withdraw.
#[derive(Accounts)]
pub struct Withdraw<'info> {
    /// House authority — the only account allowed to withdraw.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Game pool — source of withdrawn SOL.
    #[account(
        mut,
        seeds = [GamePool::SEEDS],
        bump = game_pool.bump,
        has_one = authority @ CrashError::Unauthorized,
    )]
    pub game_pool: Account<'info, GamePool>,

    /// CHECK: Destination for withdrawn SOL (must be the authority's wallet).
    #[account(
        mut,
        constraint = destination.key() == authority.key() @ CrashError::Unauthorized,
    )]
    pub destination: AccountInfo<'info>,
}

/// Withdraw SOL profits from the game pool to the house authority's wallet.
///
/// Safety: We never allow the pool to go below rent-exempt minimum so the
/// GamePool account stays alive.
///
/// # Arguments
/// * `amount` — Lamports to withdraw.
pub fn handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let pool_info = ctx.accounts.game_pool.to_account_info();
    let current_lamports = pool_info.lamports();

    // Keep enough lamports to remain rent-exempt
    let rent = Rent::get()?;
    let rent_exempt_minimum = rent.minimum_balance(GamePool::SIZE);

    require!(
        current_lamports.saturating_sub(amount) >= rent_exempt_minimum,
        CrashError::InsufficientProfit
    );

    // Direct lamport transfer out of the PDA (program-owned, no CPI needed)
    **pool_info.try_borrow_mut_lamports()? -= amount;
    **ctx
        .accounts
        .destination
        .to_account_info()
        .try_borrow_mut_lamports()? += amount;

    msg!(
        "Withdraw: {} lamports to {}",
        amount,
        ctx.accounts.authority.key()
    );

    Ok(())
}
