<?php

namespace App\Enums;

/**
 * The three sub-services under Développement d'entreprise.
 *
 * The enquiry form is a single select, so a lead carries exactly one.
 */
enum Prestation: string
{
    case SiteWeb = 'site_web';
    case Logo = 'logo';
    case CampagnePublicitaire = 'campagne_publicitaire';

    public function label(): string
    {
        return match ($this) {
            self::SiteWeb => 'Création de site Web',
            self::Logo => 'Création de LOGO',
            self::CampagnePublicitaire => 'Campagne publicitaire sur les réseaux',
        };
    }
}
