<?php

namespace App\Support;

/**
 * The upload ceiling the server can actually honour.
 *
 * Validation promising 10 MB while PHP is configured for 2 MB is worse than a
 * lower limit: PHP discards the oversized file before the request reaches
 * Laravel, so the rule that fires is "the file is required" — and the applicant
 * is told they forgot a document they actually attached. Taking the smaller of
 * the two makes the error message true.
 */
final class UploadLimits
{
    /** Kilobytes, for Laravel's `max:` rule. */
    public static function maxKilobytes(): int
    {
        $configured = (int) config('leads.max_upload_kb');
        $php = self::bytesFromIni('upload_max_filesize') / 1024;

        return (int) max(1, min($configured, $php));
    }

    /** True when php.ini is the binding constraint, worth surfacing in ops. */
    public static function isConstrainedByPhp(): bool
    {
        return self::maxKilobytes() < (int) config('leads.max_upload_kb');
    }

    private static function bytesFromIni(string $directive): float
    {
        $value = trim((string) ini_get($directive));

        if ($value === '') {
            return INF;
        }

        $unit = strtolower(substr($value, -1));
        $number = (float) $value;

        return match ($unit) {
            'g' => $number * 1024 ** 3,
            'm' => $number * 1024 ** 2,
            'k' => $number * 1024,
            default => $number,
        };
    }
}
