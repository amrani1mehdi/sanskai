<?php

namespace App\Enums;

/** Anything worth keeping in a lead's history. */
enum ActivityKind: string
{
    case Creation = 'creation';
    case Statut = 'statut';
    case Note = 'note';
    case Appel = 'appel';
    case Email = 'email';
    case Document = 'document';
    /** A field on the fiche was corrected. Carries the before and after. */
    case Modification = 'modification';
}
