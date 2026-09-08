<?php

namespace App\Http\Requests\Api;

use App\Enums\PostStatus;
use App\Models\BlogPost;
use App\Rules\ValidUtf8;
use App\Support\UploadLimits;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * A new article.
 *
 * Every language is required on create. An article that exists in one language
 * and not the others is a page that renders in French and 404s in German, and
 * the point of holding all three on one row was to make that impossible.
 */
class StoreBlogPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $rules = [
            'status' => ['sometimes', Rule::enum(PostStatus::class)],
            'publishedAt' => ['sometimes', 'nullable', 'date'],
            'cover' => [
                'sometimes',
                'nullable',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:'.UploadLimits::maxKilobytes(),
            ],
        ];

        foreach (BlogPost::LOCALES as $locale) {
            /* `ValidUtf8` on every free-text field: bytes that are not UTF-8
               are stored happily and then break `json_encode` for every
               listing the article appears in, not just its own page. */
            /* Optional per language: the controller derives one from that
               language's own title when it is absent, which is what the editor
               normally lets it do. */
            $rules["slug.{$locale}"] = ['sometimes', 'nullable', 'string', 'max:180', new ValidUtf8];
            $rules["title.{$locale}"] = ['required', 'string', 'max:180', new ValidUtf8];
            $rules["excerpt.{$locale}"] = ['nullable', 'string', 'max:400', new ValidUtf8];
            $rules["body.{$locale}"] = ['required', 'string', 'max:120000', new ValidUtf8];
        }

        return $rules;
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        $names = ['cover' => 'image de couverture'];

        // Without these the message reads "le champ title.de est obligatoire",
        // which does not tell an author which tab to go back to.
        $labels = ['en' => 'anglais', 'fr' => 'français', 'de' => 'allemand'];

        foreach ($labels as $locale => $label) {
            $names["title.{$locale}"] = "titre ({$label})";
            $names["excerpt.{$locale}"] = "résumé ({$label})";
            $names["body.{$locale}"] = "contenu ({$label})";
        }

        return $names;
    }
}
