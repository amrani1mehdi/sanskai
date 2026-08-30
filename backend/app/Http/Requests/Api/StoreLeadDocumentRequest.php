<?php

namespace App\Http\Requests\Api;

use App\Enums\DocumentKind;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
                'max:'.config('leads.max_upload_kb'),
            ],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['kind' => 'type de document', 'file' => 'fichier'];
    }
}
