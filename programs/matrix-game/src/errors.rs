use anchor_lang::prelude::*;

#[error_code]
pub enum GameError {
    #[msg("Invalid block number. Must be between 0 and 8")]
    InvalidBlockNumber,

    #[msg("Invalid bet amount. Must be greater than 0")]
    InvalidBetAmount,

    #[msg("Game is not active")]
    GameNotActive,

    #[msg("Game has been finalized")]
    GameFinalized,

    #[msg("Game has already been finalized")]
    AlreadyFinalized,

    #[msg("This player did not win")]
    NotAWinner,

    #[msg("Winnings have already been claimed")]
    AlreadyClaimed,

    #[msg("Pool overflow")]
    PoolOverflow,

    #[msg("Bet count overflow")]
    BetCountOverflow,

    #[msg("Amount overflow")]
    AmountOverflow,

    #[msg("Game is not finalized")]
    GameNotFinalized,

    #[msg("Insufficient funds to cover payout")]
    InsufficientFunds,

    #[msg("No bets placed on game")]
    NoBetsOnGame,

    #[msg("Unauthorized signer")]
    Unauthorized,

    #[msg("Invalid program state")]
    InvalidProgramState,
}
