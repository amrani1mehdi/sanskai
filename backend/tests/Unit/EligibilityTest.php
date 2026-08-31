<?php

namespace Tests\Unit;

use App\Support\Eligibility;
use Carbon\CarbonImmutable;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

/**
 * Guards the parity between this and the website's `src/lib/eligibility.ts`.
 *
 * The two implement the same rule on either side of the wire; if they ever
 * disagree, the site tells an applicant one thing and the API does another.
 * The cases below are the ones where a naive implementation drifts.
 */
class EligibilityTest extends TestCase
{
    private const NOW = '2026-08-30';

    #[Test]
    public function it_accepts_a_company_at_exactly_six_months(): void
    {
        // The website's own test says exactly six months qualifies.
        $this->assertTrue(
            Eligibility::companyAge('2026-02-28', CarbonImmutable::parse(self::NOW)),
        );
    }

    #[Test]
    public function it_rejects_a_company_one_day_short(): void
    {
        $this->assertFalse(
            Eligibility::companyAge('2026-03-01', CarbonImmutable::parse(self::NOW)),
        );
    }

    #[Test]
    public function it_does_not_overflow_a_short_month(): void
    {
        // 31 August minus six months must land in February, not roll into March.
        $this->assertTrue(
            Eligibility::companyAge('2026-02-28', CarbonImmutable::parse('2026-08-31')),
        );
    }

    #[Test]
    public function it_rejects_a_missing_or_unreadable_date(): void
    {
        $now = CarbonImmutable::parse(self::NOW);

        $this->assertFalse(Eligibility::companyAge(null, $now));
        $this->assertFalse(Eligibility::companyAge('', $now));
        $this->assertFalse(Eligibility::companyAge('30/08/2020', $now));
    }

    /**
     * People write the same figure a dozen ways, and the separators swap
     * between the site's three locales.
     */
    #[Test]
    #[DataProvider('amounts')]
    public function it_reads_amounts_written_by_humans(?string $input, ?float $expected): void
    {
        $this->assertSame($expected, Eligibility::parseAmount($input));
    }

    /** @return array<string, array{0: ?string, 1: ?float}> */
    public static function amounts(): array
    {
        return [
            'plain' => ['7000', 7000.0],
            'french spacing' => ['7 000', 7000.0],
            'english thousands' => ['7,000', 7000.0],
            'german thousands' => ['7.000', 7000.0],
            'with currency' => ['7 000 €', 7000.0],
            'french decimals' => ['7 000,50', 7000.5],
            'english decimals' => ['7,000.50', 7000.5],
            'no digits' => ['abc', null],
            'empty' => ['', null],
            'null' => [null, null],
        ];
    }

    #[Test]
    public function it_accepts_revenue_at_exactly_the_floor(): void
    {
        $this->assertTrue(Eligibility::revenue('7000'));
        $this->assertTrue(Eligibility::revenue('7 000 €'));
        $this->assertFalse(Eligibility::revenue('6999'));
        $this->assertFalse(Eligibility::revenue(null));
    }
}
