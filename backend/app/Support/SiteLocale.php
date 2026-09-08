<?php

namespace App\Support;

use App\Models\BlogPost;
use Illuminate\Http\Request;

/**
 * Which language the public site is asking for.
 *
 * The website's own locale lives in a cookie on its origin and never reaches
 * this API, so it is passed as `?locale=`. Resolved in one place because both
 * the article and the listing need the same answer, and both need the same
 * forgiving behaviour: an unrecognised value falls back rather than erroring,
 * since a stray query string should not 422 a blog page.
 */
final class SiteLocale
{
    /** The language the business works in, and the one everything falls back to. */
    public const DEFAULT = 'fr';

    public static function from(Request $request): string
    {
        $locale = (string) $request->query('locale', self::DEFAULT);

        return in_array($locale, BlogPost::LOCALES, true) ? $locale : self::DEFAULT;
    }
}
