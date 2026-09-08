<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Rejects text that is not valid UTF-8.
 *
 * The blast radius is what makes this worth a rule of its own. PHP will store
 * whatever bytes it is handed, but `json_encode` refuses them — so a single
 * article carrying one mis-encoded character does not fail on its own page, it
 * takes down every listing that includes it: the authoring table, the public
 * index and the API behind both, all 500, and the article that caused it is not
 * named in the error.
 *
 * A browser posting a form always sends UTF-8, so this never fires for the
 * editor. It fires for anything else that talks to the API — a script, a
 * misconfigured proxy, an import — which is exactly the traffic that has no
 * one watching it.
 */
class ValidUtf8 implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        if (! mb_check_encoding($value, 'UTF-8')) {
            $fail('Le champ :attribute contient des caractères mal encodés.');
        }
    }
}
