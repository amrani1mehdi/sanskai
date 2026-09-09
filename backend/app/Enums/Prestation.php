<?php

namespace App\Enums;

/**
 * The three sub-services under Développement Digital.
 *
 * The enquiry form is a single select, so a lead carries exactly one.
 */
enum Prestation: string
{
    case SiteWeb = 'site_web';
    case Logo = 'logo';
    case MigrationSite = 'migration_site';

    public function label(): string
    {
        return match ($this) {
            self::SiteWeb => 'Création de site Web',
            self::Logo => 'Création de LOGO',
            self::MigrationSite => 'Migration ou reconstruction de site web',
        };
    }

    /**
     * The names this value used to go by.
     *
     * The third slot was the advertising service, stored as
     * `campagne_publicitaire`. Stored rows were migrated, but a browser holding
     * the page from before the change still posts the old name, and rejecting
     * those would lose real enquiries for as long as those tabs stay open.
     *
     * @var array<string, string>
     */
    public const LEGACY_VALUES = [
        'campagne_publicitaire' => 'migration_site',
    ];

    /** The current name for `$value`, which may be one it used to have. */
    public static function normalise(string $value): string
    {
        return self::LEGACY_VALUES[$value] ?? $value;
    }
}
