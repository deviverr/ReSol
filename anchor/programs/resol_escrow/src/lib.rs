//! resol_escrow — on-chain escrow for the Resol hyperlocal secondhand marketplace.
//!
//! Flow: seller `create_listing` -> buyer `reserve` (USDC locked in a per-item vault)
//! -> at meetup the seller scans the buyer's QR and calls `release` (sha256 code gate;
//! 98.5% to seller, 1.5% to treasury). A buyer may `cancel_reservation` for a full
//! refund, and anyone may `auto_refund` a stale reservation after 7 days.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hash;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

declare_id!("BJbjgczJvjSb4GXPcjDWLPUQdfKRe7SFPCXQqZLcsrBw");

/// The SPL mint accepted for all transfers. Selected at compile time:
/// `--features mainnet` uses canonical mainnet USDC; the default is the devnet
/// test mint we control (real USDC has no accounts on devnet).
#[cfg(feature = "mainnet")]
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
#[cfg(not(feature = "mainnet"))]
pub const USDC_MINT: Pubkey = pubkey!("B3rGdGRvZjkP1N2BJiRqyeQAm9sCeeP1vbkwzQcWSnSD");

/// Wallet that receives the protocol fee.
pub const TREASURY: Pubkey = pubkey!("FvSfLTD5HQGCJa89WP3UzMFrBM12vavjKdvH4iQeizBb");

/// Protocol fee in basis points (1.5%).
pub const FEE_BPS: u64 = 150;
/// Reservations older than this (seconds) can be auto-refunded by anyone (7 days).
pub const REFUND_WINDOW: i64 = 7 * 24 * 60 * 60;

#[program]
pub mod resol_escrow {
    use super::*;

    /// Seller creates a listing. `item_id` is a client-chosen u64 that also keys
    /// the off-chain Supabase row, so the two stores stay in sync.
    pub fn create_listing(ctx: Context<CreateListing>, item_id: u64, price: u64) -> Result<()> {
        require!(price > 0, EscrowError::InvalidPrice);
        let listing = &mut ctx.accounts.listing;
        listing.seller = ctx.accounts.seller.key();
        listing.item_id = item_id;
        listing.price = price;
        listing.status = ListingStatus::Active;
        listing.created_at = Clock::get()?.unix_timestamp;
        listing.buyer = Pubkey::default();
        listing.code_hash = [0u8; 32];
        listing.reserved_at = 0;
        listing.bump = ctx.bumps.listing;
        Ok(())
    }

    /// Buyer reserves an active listing, moving `price` USDC into the vault and
    /// recording the sha256 of the 6-digit handoff code.
    pub fn reserve(ctx: Context<Reserve>, _item_id: u64, code_hash: [u8; 32]) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.status == ListingStatus::Active, EscrowError::NotActive);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_token_account.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            listing.price,
        )?;

        listing.buyer = ctx.accounts.buyer.key();
        listing.code_hash = code_hash;
        listing.reserved_at = Clock::get()?.unix_timestamp;
        listing.status = ListingStatus::Reserved;
        Ok(())
    }

    /// Releases escrow once the correct handoff code is presented. Pays the seller
    /// `price - fee` and the treasury `fee`, then closes the vault. Callable by
    /// either party — the sha256 preimage is the sole authorization.
    pub fn release(ctx: Context<Release>, item_id: u64, code: String) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.status == ListingStatus::Reserved, EscrowError::NotReserved);

        // Verify sha256(code) == stored hash.
        require!(
            hash(code.as_bytes()).to_bytes() == listing.code_hash,
            EscrowError::InvalidCode
        );

        // Effects before interactions: flip status first so a re-entrant CPI (or a
        // replayed call) sees a non-Reserved listing and bails at the guard above.
        listing.status = ListingStatus::Sold;

        let price = listing.price;
        let fee = price
            .checked_mul(FEE_BPS)
            .and_then(|v| v.checked_div(10_000))
            .ok_or(EscrowError::MathOverflow)?;
        let seller_amount = price.checked_sub(fee).ok_or(EscrowError::MathOverflow)?;

        let item_id_bytes = item_id.to_le_bytes();
        let bump = [ctx.bumps.vault_authority];
        let seeds: &[&[u8]] = &[b"vault_auth", item_id_bytes.as_ref(), &bump];
        let signer: &[&[&[u8]]] = &[seeds];

        // Vault -> seller (98.5%).
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.seller_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                signer,
            ),
            seller_amount,
        )?;

        // Vault -> treasury (1.5%).
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.treasury_token_account.to_account_info(),
                    authority: ctx.accounts.vault_authority.to_account_info(),
                },
                signer,
            ),
            fee,
        )?;

        // Reclaim the vault's rent for the buyer who paid to open it.
        close_vault(
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            &ctx.accounts.buyer,
            &ctx.accounts.vault_authority,
            signer,
        )?;

        Ok(())
    }

    /// Buyer cancels their own reservation while still Reserved; full refund, back to Active.
    pub fn cancel_reservation(ctx: Context<CancelReservation>, item_id: u64) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.status == ListingStatus::Reserved, EscrowError::NotReserved);

        refund_and_reset(
            listing,
            item_id,
            ctx.bumps.vault_authority,
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            &ctx.accounts.buyer_token_account,
            &ctx.accounts.buyer.to_account_info(),
            &ctx.accounts.vault_authority,
        )
    }

    /// Anyone may refund a reservation left Reserved past the 7-day window.
    pub fn auto_refund(ctx: Context<AutoRefund>, item_id: u64) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.status == ListingStatus::Reserved, EscrowError::NotReserved);
        let now = Clock::get()?.unix_timestamp;
        require!(
            now > listing
                .reserved_at
                .checked_add(REFUND_WINDOW)
                .ok_or(EscrowError::MathOverflow)?,
            EscrowError::RefundWindowNotElapsed
        );

        refund_and_reset(
            listing,
            item_id,
            ctx.bumps.vault_authority,
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            &ctx.accounts.buyer_token_account,
            &ctx.accounts.buyer,
            &ctx.accounts.vault_authority,
        )
    }
}

/// Shared refund path for cancel + auto_refund: move the full balance back to the
/// buyer, close the vault, and reset the listing to Active. Flips status before the
/// transfer so the guards block any re-entrant/replayed refund.
#[allow(clippy::too_many_arguments)]
fn refund_and_reset<'info>(
    listing: &mut Account<'info, Listing>,
    item_id: u64,
    vault_auth_bump: u8,
    token_program: &Program<'info, Token>,
    vault: &Account<'info, TokenAccount>,
    buyer_token_account: &Account<'info, TokenAccount>,
    buyer: &AccountInfo<'info>,
    vault_authority: &UncheckedAccount<'info>,
) -> Result<()> {
    listing.status = ListingStatus::Active;
    let amount = listing.price;

    let item_id_bytes = item_id.to_le_bytes();
    let bump = [vault_auth_bump];
    let seeds: &[&[u8]] = &[b"vault_auth", item_id_bytes.as_ref(), &bump];
    let signer: &[&[&[u8]]] = &[seeds];

    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Transfer {
                from: vault.to_account_info(),
                to: buyer_token_account.to_account_info(),
                authority: vault_authority.to_account_info(),
            },
            signer,
        ),
        amount,
    )?;

    close_vault(token_program, vault, buyer, vault_authority, signer)?;

    listing.buyer = Pubkey::default();
    listing.code_hash = [0u8; 32];
    listing.reserved_at = 0;
    Ok(())
}

/// Closes the (now-empty) vault token account, returning its rent lamports to `rent_to`.
fn close_vault<'info>(
    token_program: &Program<'info, Token>,
    vault: &Account<'info, TokenAccount>,
    rent_to: &AccountInfo<'info>,
    vault_authority: &UncheckedAccount<'info>,
    signer: &[&[&[u8]]],
) -> Result<()> {
    token::close_account(CpiContext::new_with_signer(
        token_program.to_account_info(),
        CloseAccount {
            account: vault.to_account_info(),
            destination: rent_to.clone(),
            authority: vault_authority.to_account_info(),
        },
        signer,
    ))
}

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub seller: Pubkey,
    pub item_id: u64,
    pub price: u64,
    pub status: ListingStatus,
    pub created_at: i64,
    pub buyer: Pubkey,
    pub code_hash: [u8; 32],
    pub reserved_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ListingStatus {
    Active,
    Reserved,
    Sold,
}

#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct CreateListing<'info> {
    #[account(
        init,
        payer = seller,
        space = 8 + Listing::INIT_SPACE,
        seeds = [b"listing", item_id.to_le_bytes().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct Reserve<'info> {
    #[account(
        mut,
        seeds = [b"listing", item_id.to_le_bytes().as_ref()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(address = USDC_MINT @ EscrowError::InvalidMint)]
    pub usdc_mint: Account<'info, Mint>,
    #[account(mut, token::mint = usdc_mint, token::authority = buyer)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA that owns the vault; address enforced by seeds.
    #[account(seeds = [b"vault_auth", item_id.to_le_bytes().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault_authority
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct Release<'info> {
    #[account(
        mut,
        seeds = [b"listing", item_id.to_le_bytes().as_ref()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
    /// Either party may submit the release tx; they pay fees + any ATA rent.
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(address = USDC_MINT @ EscrowError::InvalidMint)]
    pub usdc_mint: Account<'info, Mint>,
    /// CHECK: must equal the listing's seller; receives proceeds.
    #[account(address = listing.seller @ EscrowError::Unauthorized)]
    pub seller: UncheckedAccount<'info>,
    /// CHECK: must equal the listing's buyer; receives reclaimed vault rent.
    #[account(mut, address = listing.buyer @ EscrowError::Unauthorized)]
    pub buyer: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = caller,
        associated_token::mint = usdc_mint,
        associated_token::authority = seller
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    /// CHECK: fixed treasury wallet.
    #[account(address = TREASURY @ EscrowError::Unauthorized)]
    pub treasury: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = caller,
        associated_token::mint = usdc_mint,
        associated_token::authority = treasury
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA that owns the vault; address enforced by seeds.
    #[account(seeds = [b"vault_auth", item_id.to_le_bytes().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault_authority
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct CancelReservation<'info> {
    #[account(
        mut,
        seeds = [b"listing", item_id.to_le_bytes().as_ref()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
    /// Only the buyer who reserved may cancel.
    #[account(mut, address = listing.buyer @ EscrowError::Unauthorized)]
    pub buyer: Signer<'info>,
    #[account(address = USDC_MINT @ EscrowError::InvalidMint)]
    pub usdc_mint: Account<'info, Mint>,
    #[account(mut, token::mint = usdc_mint, token::authority = buyer)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA that owns the vault; address enforced by seeds.
    #[account(seeds = [b"vault_auth", item_id.to_le_bytes().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault_authority
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(item_id: u64)]
pub struct AutoRefund<'info> {
    #[account(
        mut,
        seeds = [b"listing", item_id.to_le_bytes().as_ref()],
        bump = listing.bump
    )]
    pub listing: Account<'info, Listing>,
    /// Anyone can trigger a stale-reservation refund.
    #[account(mut)]
    pub caller: Signer<'info>,
    #[account(address = USDC_MINT @ EscrowError::InvalidMint)]
    pub usdc_mint: Account<'info, Mint>,
    /// CHECK: must equal the listing's buyer; receives the refund + vault rent.
    #[account(mut, address = listing.buyer @ EscrowError::Unauthorized)]
    pub buyer: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = buyer)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    /// CHECK: PDA that owns the vault; address enforced by seeds.
    #[account(seeds = [b"vault_auth", item_id.to_le_bytes().as_ref()], bump)]
    pub vault_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault_authority
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum EscrowError {
    #[msg("Listing is not active")]
    NotActive,
    #[msg("Listing is not reserved")]
    NotReserved,
    #[msg("Invalid release code")]
    InvalidCode,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid USDC mint")]
    InvalidMint,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Refund window has not elapsed")]
    RefundWindowNotElapsed,
    #[msg("Price must be greater than zero")]
    InvalidPrice,
}
