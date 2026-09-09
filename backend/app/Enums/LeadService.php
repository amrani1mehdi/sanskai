<?php

namespace App\Enums;

/**
 * The three ways an enquiry reaches the CRM.
 *
 * Fixed domain values owned by the code, not rows in a table: adding one is a
 * deploy either way, and a lookup table would only add a join.
 */
enum LeadService: string
{
    case Financement = 'financement';
    case Developpement = 'developpement';
    case Contact = 'contact';

    public function label(): string
    {
        return match ($this) {
            self::Financement => 'Demande de financement',
            self::Developpement => 'Développement Digital',
            self::Contact => 'Message de contact',
        };
    }

    /** The page the lead was submitted from. */
    public function source(): string
    {
        return match ($this) {
            self::Financement => '/financement',
            self::Developpement => '/developpement-entreprise',
            self::Contact => '/contact',
        };
    }

    /** Prefix for the human-readable reference, e.g. CON-2026-0001. */
    public function referencePrefix(): string
    {
        return match ($this) {
            self::Financement => 'FIN',
            self::Developpement => 'DEV',
            self::Contact => 'CON',
        };
    }
}
