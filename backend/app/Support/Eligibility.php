<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/**
 * Cash flow financing eligibility.
 *
 * A deliberate port of the website's `src/lib/eligibility.ts`, thresholds and
 * edge cases included, so the API can never accept what the form rejected or
 * reject what it accepted. If one side's numbers change, the other has to.
 */
final class Eligibility
{
    /** Months of trading history required. Meeting it exactly is enough. */
    public const MIN_COMPANY_AGE_MONTHS = 6;

    /** Monthly revenue floor, in euros. Meeting it exactly is enough. */
    public const MIN_MONTHLY_REVENUE = 7000;

    /**
     * Whether a company founded on `$createdAt` has enough trading history.
     *
     * Compared against a cut-off date rather than a count of whole months: a
     * company six months and one day old has more than six months of history,
     * but rounding down to whole months would call it six.
     */
    public static function companyAge(?string $createdAt, ?CarbonImmutable $now = null): bool
    {
        if (blank($createdAt)) {
            return false;
        }

        $date = self::parseDate($createdAt);

        if ($date === null) {
            return false;
        }

        $cutoff = ($now ?? CarbonImmutable::now())
            ->startOfDay()
            ->subMonthsNoOverflow(self::MIN_COMPANY_AGE_MONTHS);

        // On or before the cut-off, so reaching exactly six months qualifies.
        return $date->lessThanOrEqualTo($cutoff);
    }

    /** Whether the stated monthly revenue reaches the floor. */
    public static function revenue(?string $amount): bool
    {
        $value = self::parseAmount($amount);

        return $value !== null && $value >= self::MIN_MONTHLY_REVENUE;
    }

    /**
     * Reads a money amount typed by a human, in any of the site's locales.
     *
     * People write the same figure as "7000", "7,000", "7 000", "7.000" or
     * "7 000,50 €", and the thousands and decimal separators swap between
     * French, English and German. Returns null when nothing numeric is there.
     */
    public static function parseAmount(?string $amount): ?float
    {
        if (blank($amount)) {
            return null;
        }

        // Strip everything that is not a digit or a separator.
        $cleaned = preg_replace('/[^0-9.,]/u', '', $amount) ?? '';

        if ($cleaned === '') {
            return null;
        }

        $lastComma = strrpos($cleaned, ',');
        $lastDot = strrpos($cleaned, '.');

        // Whichever separator comes last is the decimal one; the other groups
        // thousands. With only one kind present, a group of exactly three
        // digits after it is thousands ("7.000"), anything else is decimals.
        if ($lastComma !== false && $lastDot !== false) {
            $decimal = $lastComma > $lastDot ? ',' : '.';
        } elseif ($lastComma !== false || $lastDot !== false) {
            $separator = $lastComma !== false ? ',' : '.';
            $tail = substr($cleaned, ($lastComma !== false ? $lastComma : $lastDot) + 1);
            $decimal = strlen($tail) === 3 ? '' : $separator;
        } else {
            $decimal = '';
        }

        if ($decimal === '') {
            $normalised = preg_replace('/[.,]/', '', $cleaned) ?? '';
        } else {
            $grouping = $decimal === ',' ? '.' : ',';
            $normalised = str_replace($grouping, '', $cleaned);
            $normalised = str_replace($decimal, '.', $normalised);
        }

        return is_numeric($normalised) ? (float) $normalised : null;
    }

    /** Accepts the `YYYY-MM-DD` the form's date picker produces. */
    private static function parseDate(string $value): ?CarbonImmutable
    {
        try {
            return CarbonImmutable::createFromFormat('Y-m-d', $value)?->startOfDay();
        } catch (\Throwable) {
            return null;
        }
    }
}
