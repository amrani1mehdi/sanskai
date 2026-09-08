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

        return (int) max(1, min($configured, self::phpCeilingKilobytes()));
    }

    /**
     * What PHP will actually accept, in kilobytes.
     *
     * Two directives rather than one. `upload_max_filesize` caps the file;
     * `post_max_size` caps the whole request, and one article save carries
     * the picture alongside the title, summary and body in three languages.
     * Reading only the first meant a 2 MB ceiling could be reported as 10 MB
     * whenever post_max_size was the smaller of the pair.
     */
    private static function phpCeilingKilobytes(): float
    {
        return min(
            self::bytesFromIni('upload_max_filesize'),
            self::bytesFromIni('post_max_size'),
        ) / 1024;
    }

    /** True when php.ini is the binding constraint, worth surfacing in ops. */
    public static function isConstrainedByPhp(): bool
    {
        return self::maxKilobytes() < (int) config('leads.max_upload_kb');
    }

    /**
     * Why an upload was refused, in words an author can act on.
     *
     * PHP throws away a file that breaches either directive before any of
     * this application runs, so the rule that fires is `uploaded` — whose
     * stock message is "the file failed to upload" and names no cause. An
     * author reading that has no way to tell a broken server from a photo
     * that is simply too big.
     */
    public static function tooLargeMessage(string $what): string
    {
        $mb = round(self::maxKilobytes() / 1024, 1);

        return "L'envoi de {$what} a échoué. La taille maximale est de {$mb} Mo.";
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
