<?php

namespace App\Enums;

/**
 * The four upload slots on the financing form, the contact form's invoices,
 * the partner form's onboarding papers, and a catch-all.
 */
enum DocumentKind: string
{
    case PieceIdentite = 'piece_identite';
    case Kbis = 'kbis';
    case ReleveBancaire = 'releve_bancaire';
    case Comptable = 'comptable';
    case Facture = 'facture';
    /* The partner form's own papers: an employee's proof of employment, proof
       of address when housed by someone else, and bank details for payouts. */
    case AttestationEmployeur = 'attestation_employeur';
    case AttestationHebergement = 'attestation_hebergement';
    case Rib = 'rib';
    case Autre = 'autre';

    public function label(): string
    {
        return match ($this) {
            self::PieceIdentite => "Pièce d'identité",
            self::Kbis => "Kbis / justificatif d'immatriculation",
            self::ReleveBancaire => 'Relevé bancaire des 6 derniers mois',
            self::Comptable => 'Informations financières / comptables',
            self::Facture => 'Facture',
            self::AttestationEmployeur => "Attestation d'employeur",
            self::AttestationHebergement => "Attestation d'hébergement",
            self::Rib => 'RIB',
            self::Autre => 'Autre document',
        };
    }

    /**
     * How many files the slot holds.
     *
     * An identity card has two sides, and a phone photographs them as two
     * pictures — so the identity slot takes the recto and the verso rather
     * than forcing someone to merge them first. Kbis, the bank statement and
     * the partner papers are one document each — the statement covers six
     * months in a single export, not six files. Financial and accounting
     * papers vary by dossier (balance sheet, P&L, tax return), so that slot
     * takes as many as the applicant has. `Autre` is the same kind of
     * open-ended pile.
     */
    public function allowsMultiple(): bool
    {
        return match ($this) {
            // Invoices come in batches by their nature — the contact form's
            // label says "factures", plural, and means it.
            self::PieceIdentite, self::Comptable, self::Facture, self::Autre => true,
            self::Kbis, self::ReleveBancaire,
            self::AttestationEmployeur, self::AttestationHebergement, self::Rib => false,
        };
    }

    /**
     * Nothing is required to submit a dossier.
     *
     * A form that refuses an applicant for a missing Kbis loses the lead
     * entirely; chasing the paperwork afterwards is the back office's job, and
     * every slot is now optional for that reason.
     *
     * The partner form is the exception, and says so in its own request: its
     * whole purpose is collecting these papers, so it requires them there
     * rather than through this flag, which describes the financing dossier.
     */
    public function isRequiredOnSubmission(): bool
    {
        return false;
    }
}
