<?php

namespace App\Enums;

/**
 * The two services the website sells.
 *
 * Fixed domain values owned by the code, not rows in a table: adding one is a
 * deploy either way, and a lookup table would only add a join.
 */
enum LeadService: string
{
    case Financement = 'financement';
    case Developpement = 'developpement';

    public function label(): string
    {
        return match ($this) {
            self::Financement => 'Demande de financement',
            self::Developpement => "Développement d'entreprise",
        };
    }

    /** The page the lead was submitted from. */
    public function source(): string
    {
        return match ($this) {
            self::Financement => '/financement',
            self::Developpement => '/developpement-entreprise',
        };
    }
}
