<?php

namespace App\Enums;

/** The four upload slots on the financing form, plus a catch-all. */
enum DocumentKind: string
{
    case PieceIdentite = 'piece_identite';
    case Kbis = 'kbis';
    case ReleveBancaire = 'releve_bancaire';
    case Comptable = 'comptable';
    case Autre = 'autre';

    public function label(): string
    {
        return match ($this) {
            self::PieceIdentite => "Pièce d'identité",
            self::Kbis => "Kbis / justificatif d'immatriculation",
            self::ReleveBancaire => 'Relevés bancaires professionnels',
            self::Comptable => 'Documents comptables',
            self::Autre => 'Autre document',
        };
    }

    /** Only the identity document is optional on the financing form. */
    public function isRequiredOnSubmission(): bool
    {
        return match ($this) {
            self::Kbis, self::ReleveBancaire, self::Comptable => true,
            self::PieceIdentite, self::Autre => false,
        };
    }
}
