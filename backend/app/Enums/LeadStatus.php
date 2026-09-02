<?php

namespace App\Enums;

/**
 * Where a lead stands.
 *
 * One pipeline, whatever the lead came in on. Contact messages used to run a
 * two-state track of their own — answered or not — on the reasoning that
 * "Qualifié" and "Approuvé" mean nothing on a question someone asked. They do:
 * a message gets read, the person gets called, and it either turns into work or
 * it does not, which is the same six steps everything else takes. Keeping it
 * separate only meant looking in two places for one job.
 */
enum LeadStatus: string
{
    case Nouveau = 'nouveau';
    case AExaminer = 'a_examiner';
    case Qualifie = 'qualifie';
    case EnCours = 'en_cours';
    case Approuve = 'approuve';
    case Refuse = 'refuse';

    /**
     * Legacy. Contact messages held this before they joined the pipeline; the
     * rows were migrated to `AExaminer`. Kept so an old value still resolves to
     * a label rather than blowing up, and never offered.
     */
    case Repondu = 'repondu';

    public function label(): string
    {
        return match ($this) {
            self::Nouveau => 'Nouveau',
            self::AExaminer => 'Contacté',
            self::Qualifie => 'Qualifié',
            self::EnCours => 'En cours',
            self::Approuve => 'Approuvé',
            self::Refuse => 'Refusé',
            self::Repondu => 'Répondu',
        };
    }

    /**
     * The label in the context of a service.
     *
     * There is one wording now that every service runs the same pipeline — a
     * contact message that just arrived is "Nouveau", like everything else.
     * The signature stays because the trail and the API both read a status in
     * the context of its lead, and a service-specific wording may return.
     */
    public function labelFor(LeadService $service): string
    {
        return $this->label();
    }

    /**
     * The statuses a lead of this service may hold.
     *
     * The same six for everything, now that contact messages run the pipeline
     * too. `$service` is kept rather than dropped: it is what every caller
     * already passes, and the day one service needs its own stage back this is
     * the one place that has to change.
     *
     * `Repondu` is deliberately absent — it is a value that may still be read
     * from an old row, never one that may be set.
     *
     * @return list<self>
     */
    public static function forService(LeadService $service): array
    {
        return [
            self::Nouveau,
            self::AExaminer,
            self::Qualifie,
            self::EnCours,
            self::Approuve,
            self::Refuse,
        ];
    }

    /** True when this status is meaningful for that service. */
    public function allowedFor(LeadService $service): bool
    {
        return in_array($this, self::forService($service), true);
    }
}
