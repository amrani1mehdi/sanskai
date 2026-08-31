<?php

namespace App\Enums;

/**
 * The four upload slots on the financing form, the contact form's invoices,
 * and a catch-all.
 */
enum DocumentKind: string
{
    case PieceIdentite = 'piece_identite';
    case Kbis = 'kbis';
    case ReleveBancaire = 'releve_bancaire';
    case Comptable = 'comptable';
    case Facture = 'facture';
    case Autre = 'autre';

    public function label(): string
    {
        return match ($this) {
            self::PieceIdentite => "Pièce d'identité",
            self::Kbis => "Kbis / justificatif d'immatriculation",
            self::ReleveBancaire => 'Relevé bancaire des 6 derniers mois',
            self::Comptable => 'Informations financières / comptables',
            self::Facture => 'Facture',
            self::Autre => 'Autre document',
        };
    }

    /**
     * How many files the slot holds.
     *
     * Identity, Kbis and the bank statement are one document each — the
     * statement covers six months in a single export, not six files. Financial
     * and accounting papers vary by dossier (balance sheet, P&L, tax return),
     * so that slot takes as many as the applicant has. `Autre` is the same kind
     * of open-ended pile.
     */
    public function allowsMultiple(): bool
    {
        return match ($this) {
            // Invoices come in batches by their nature — the contact form's
            // label says "factures", plural, and means it.
            self::Comptable, self::Facture, self::Autre => true,
            self::PieceIdentite, self::Kbis, self::ReleveBancaire => false,
        };
    }

    /**
     * Nothing is required to submit a dossier.
     *
     * A form that refuses an applicant for a missing Kbis loses the lead
     * entirely; chasing the paperwork afterwards is the back office's job, and
     * every slot is now optional for that reason.
     */
    public function isRequiredOnSubmission(): bool
    {
        return false;
    }
}
