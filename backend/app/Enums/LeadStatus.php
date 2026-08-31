<?php

namespace App\Enums;

/**
 * Where a lead stands.
 *
 * A service enquiry moves through the six-stage pipeline; a contact message
 * does not. "Qualifié", "Approuvé" and "Refusé" mean nothing on a question
 * someone asked — the only thing worth recording there is whether it has been
 * answered. Both live in one column because both are a lead's status, and
 * `forService()` is what keeps each side offering only its own values.
 */
enum LeadStatus: string
{
    case Nouveau = 'nouveau';
    case AExaminer = 'a_examiner';
    case Qualifie = 'qualifie';
    case EnCours = 'en_cours';
    case Approuve = 'approuve';
    case Refuse = 'refuse';

    /** Contact messages only. `Nouveau` is its unanswered counterpart. */
    case Repondu = 'repondu';

    public function label(): string
    {
        return match ($this) {
            self::Nouveau => 'Nouveau',
            self::AExaminer => 'À examiner',
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
     * `nouveau` is shared, and reads differently either side: a dossier that
     * just arrived is "Nouveau", a message nobody has answered yet is
     * "Non répondu". Same stored value, two honest words for it.
     */
    public function labelFor(LeadService $service): string
    {
        if ($service === LeadService::Contact && $this === self::Nouveau) {
            return 'Non répondu';
        }

        return $this->label();
    }

    /**
     * The statuses a lead of this service may hold.
     *
     * Used to build the back office's status picker and to validate an update,
     * so a financing dossier can never be marked "Répondu" and a message can
     * never be "Approuvé".
     *
     * @return list<self>
     */
    public static function forService(LeadService $service): array
    {
        return $service === LeadService::Contact
            ? [self::Nouveau, self::Repondu]
            : [
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
