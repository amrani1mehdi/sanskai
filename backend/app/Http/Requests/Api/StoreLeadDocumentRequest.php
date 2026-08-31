<?php

namespace App\Http\Requests\Api;

use App\Enums\DocumentKind;
use App\Models\Lead;
use App\Support\UploadLimits;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/** An admin attaching a document after the fact — a missing Kbis, say. */
class StoreLeadDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'kind' => ['required', Rule::enum(DocumentKind::class)],
            'file' => [
                'required', 'file',
                'mimes:'.implode(',', config('leads.accepted_mimes')),
                'max:'.UploadLimits::maxKilobytes(),
            ],
        ];
    }

    /**
     * The one-per-slot rule, enforced here as well as on the public form.
     *
     * Identity, Kbis and the bank statement hold one document each. Letting the
     * back office stack a second one would leave two Kbis on a dossier with
     * nothing saying which is current — so the old one has to be deleted first,
     * which is an explicit act rather than a silent overwrite of a file
     * somebody may still need.
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $kind = DocumentKind::tryFrom((string) $this->input('kind'));
                $lead = $this->route('lead');

                if (! $kind || $kind->allowsMultiple() || ! $lead instanceof Lead) {
                    return;
                }

                if ($lead->documents()->where('kind', $kind->value)->exists()) {
                    $validator->errors()->add(
                        'kind',
                        "Ce dossier a déjà un document « {$kind->label()} ». "
                            .'Supprimez-le avant d\'en ajouter un autre.',
                    );
                }
            },
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['kind' => 'type de document', 'file' => 'fichier'];
    }
}
