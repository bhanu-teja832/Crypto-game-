use anchor_lang::prelude::*;
use crate::state::GamePool;
use crate::errors::CrashError;

/// Accounts for the initialize instruction.
#[derive(Accounts)]
pub struct Initialize<'info> {
    /// The house owner — pays for the GamePool account and becomes the authority.
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The game pool PDA. Created here; holds all house funds and global state.
    #[account(
        init,
        payer = authority,
        space = GamePool::SIZE,
        seeds = [GamePool::SEEDS],
        bump,
    )]
    pub game_pool: Account<'info, GamePool>,

    pub system_program: Program<'info, System>,
}

/// Initialize the game pool. Must be called once by the house before any rounds.
///
/// # Arguments
/// * `house_edge_bps` — House edge in basis points (e.g., 300 = 3%).
///   Used for transparency; actual enforcement is in crash-point generation.
pub fn handler(ctx: Context<Initialize>, house_edge_bps: u16) -> Result<()> {
    require!(house_edge_bps <= 1000, CrashError::Unauthorized); // Max 10% edge

    let pool = &mut ctx.accounts.game_pool;
    pool.authority = ctx.accounts.authority.key();
    pool.house_edge_bps = house_edge_bps;
    pool.total_wagered = 0;
    pool.total_paid_out = 0;
    pool.current_round = 0;
    pool.round_active = false;
    pool.bump = ctx.bumps.game_pool;

    msg!(
        "Game pool initialized. Authority: {}, House edge: {} bps",
        pool.authority,
        pool.house_edge_bps
    );

    Ok(())
}
