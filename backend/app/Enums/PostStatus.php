<?php

namespace App\Enums;

/**
 * Whether an article is visible on the public site.
 *
 * Two states, not the six a lead runs through: an article is either something
 * the public can read or it is not, and everything in between — half-written,
 * waiting on a photograph, held back for a launch date — is the same answer to
 * the only question the website asks.
 *
 * The date it went out lives on the row rather than being inferred from this,
 * so unpublishing an article and publishing it again does not silently reset
 * the day it first appeared.
 */
enum PostStatus: string
{
    case Brouillon = 'brouillon';
    case Publie = 'publie';

    public function label(): string
    {
        return match ($this) {
            self::Brouillon => 'Brouillon',
            self::Publie => 'Publié',
        };
    }

    /** @return list<self> */
    public static function all(): array
    {
        return [self::Brouillon, self::Publie];
    }
}
