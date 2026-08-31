<?php

namespace App\Enums;

/** The six stages a lead moves through, in pipeline order. */
enum LeadStatus: string
{
    case Nouveau = 'nouveau';
    case AExaminer = 'a_examiner';
    case Qualifie = 'qualifie';
    case EnCours = 'en_cours';
    case Approuve = 'approuve';
    case Refuse = 'refuse';

    public function label(): string
    {
        return match ($this) {
            self::Nouveau => 'Nouveau',
            self::AExaminer => 'À examiner',
            self::Qualifie => 'Qualifié',
            self::EnCours => 'En cours',
            self::Approuve => 'Approuvé',
            self::Refuse => 'Refusé',
        };
    }
}
